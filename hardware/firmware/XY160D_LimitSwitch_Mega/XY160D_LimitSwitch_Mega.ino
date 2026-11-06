/*
  XY160D Dual H-Bridge + 2 x KW11 limit switches - Arduino Mega 2560
  ------------------------------------------------------------------
  Port of the Raspberry Pi 4B setup (XY160D_RPi4B_wiring.png).
  Wiring diagram: XY160D_Mega2560_wiring.png on the Desktop.

  Wiring (Arduino Mega 2560):
    XY160D ENA  -> Mega D8   (PWM, Timer4C)   speed A
    XY160D IN1  -> Mega D9                    dir A
    XY160D IN2  -> Mega D10                   dir A
    XY160D ENB  -> Mega D11  (PWM, Timer1A)   speed B
    XY160D IN3  -> Mega D12                   dir B
    XY160D IN4  -> Mega D13                   dir B
    XY160D +5V  (ch A and ch B logic) -> Mega 5V    <-- see CHECK FIRST
    XY160D GND  (ch A and ch B logic) -> Mega GND   <-- common ground is required
    Limit switch 1  NC -> Mega D2,  COM -> Mega GND   (one end of motor B travel)
    Limit switch 2  NC -> Mega D7,  COM -> Mega GND   (other end of motor B travel)
    XY160D VCC / PGND -> motor supply through a 10-15 A fuse. Never to the Mega.

  CHECK FIRST: motor supply on, logic header unplugged, meter +5V to GND
  on each channel.  ~0 V = input, feed it from Mega 5V.  ~5 V = the board
  makes its own 5 V; leave +5V unconnected and only join the GNDs.

  Control logic (per channel):
    EN    IN1  IN2   result
    PWM   H    L     forward
    PWM   L    H     reverse
    LOW   x    x     off (coast)

  Runs by itself from power-up, no commands needed: motor A forward at
  AUTO_SPEED_A nonstop, motor B shuttling at AUTO_SPEED_B. It keeps going
  until power is cut, "s" is sent, or motor B hits a switch fault.

  Motor B shuttles between the two switches: when it runs into one, it
  coasts for REVERSE_PAUSE_MS, then drives the other way at the same speed.
  That switch is then ignored until motor B reaches the other one, so lever
  chatter while backing off can't send B straight back into the same switch.
  It learns which end each switch is at from the direction it was moving
  when it hit it, so the switches can go either way round.
  Motor A has no switches.

  Limit switches are wired fail-safe: NC to the pin, COM to GND, internal
  pull-up on. The pin reads LOW normally and HIGH when the switch is hit
  OR a wire breaks. Both active at once = wiring fault, motor B stops.
  A reading must hold for HIT_FILTER_US to count, so motor noise spikes
  on the switch wires are ignored.

  Serial Monitor at 9600, line ending "Newline":
    a150   motor A forward at 150   (-255 .. 255)
    a-80   motor A reverse at 80
    b200   motor B forward at 200, shuttling between the switches
    s      stop both
    ?      print status
*/

// Mega 2560 PWM pins: 2-13 and 44-46. ENA (D8) sits on Timer4 and ENB
// (D11) on Timer1, both clear of Timer0 (millis/delay); setup() sets the
// PWM frequency on each. IN1-IN4 are only ever driven HIGH/LOW, so it
// doesn't matter that 9, 10, 12 and 13 are PWM-capable too.
// D13 also drives the on-board LED, which the bootloader blinks at reset.
const uint8_t ENA = 8;    // must be a PWM pin
const uint8_t IN1 = 9;
const uint8_t IN2 = 10;
const uint8_t ENB = 11;   // must be a PWM pin
const uint8_t IN3 = 12;
const uint8_t IN4 = 13;

const uint8_t LIMIT1 = 2; // limit switch 1 NC, one end of motor B travel
const uint8_t LIMIT2 = 7; // limit switch 2 NC, other end of motor B travel

// Speeds set at power-up (-255 .. 255).
const int AUTO_SPEED_A = 230;   // 90 %, one direction, never stops
const int AUTO_SPEED_B = 230;   // 90 % shuttle speed; sign picks the first direction

// Coast this long at a switch before reversing, so the H-bridge never
// slams straight from full forward to full reverse.
const unsigned long REVERSE_PAUSE_MS = 150;

// Driving away from a pressed switch must release it within this time.
// If it doesn't, the switch is at the other end or its wire is broken: stop.
const unsigned long BACKOFF_TIMEOUT_MS = 1500;

// A switch counts as hit only after reading HIGH this long, so a noise spike
// from the motor wiring can't fake a hit (2 ms is well under 1 mm of travel).
const unsigned long HIT_FILTER_US = 2000;

// A switch counts as released only after reading clear this long.
const unsigned long RELEASE_FILTER_US = 20000;

struct Motor {
  const char *name;
  uint8_t en, inA, inB;       // inA = IN1/IN3, inB = IN2/IN4
  int speed;                  // -255 (full reverse) .. 0 (off) .. +255 (full forward)
};

Motor motorA = { "A", ENA, IN1, IN2, 0 };
Motor motorB = { "B", ENB, IN3, IN4, 0 };

struct LimitSwitch {
  uint8_t pin, number;
  int8_t end;                 // motor B direction that runs into it: +1, -1, 0 = not seen yet
  bool active;                // filtered state: true = hit or wire broken
  bool reported;              // last state printed
  bool pending;               // raw reading differs from active, timing it
  unsigned long changeStart;  // micros() when the raw reading started to differ
};

LimitSwitch limits[2] = {
  { LIMIT1, 1, 0, false, false, false, 0 },
  { LIMIT2, 2, 0, false, false, false, 0 },
};

// motor B shuttle state
int8_t backingOff = -1;       // index of the switch B is driving away from, -1 = released
unsigned long backoffStart = 0;
int8_t disarmed = -1;         // switch B last reversed at, ignored until B hits the other one

int pendingSpeed = 0;         // speed to drive at once the reverse pause ends, 0 = none
unsigned long pauseStart = 0;

char line[16];
uint8_t lineLen = 0;

// -------- low level helpers --------

// HIGH = switch hit or wire broken
bool readRaw(const LimitSwitch &l) {
  return digitalRead(l.pin) == HIGH;
}

// filtered state, kept by updateSwitch()
bool limitActive(const LimitSwitch &l) {
  return l.active;
}

// The raw reading must hold for HIT_FILTER_US (going active) or
// RELEASE_FILTER_US (going clear) before the filtered state follows it.
void updateSwitch(LimitSwitch &l) {
  bool raw = readRaw(l);
  if (raw == l.active) {
    l.pending = false;
    return;
  }
  unsigned long now = micros();
  if (!l.pending) {
    l.pending = true;
    l.changeStart = now;
  } else if (now - l.changeStart >= (raw ? HIT_FILTER_US : RELEASE_FILTER_US)) {
    l.active = raw;
    l.pending = false;
  }
}

int sign(int v) {
  return (v > 0) - (v < 0);
}

void applyOutputs(const Motor &m) {
  digitalWrite(m.en, LOW);    // off while the direction pins change
  if (m.speed > 0) {          // forward
    digitalWrite(m.inB, LOW);
    digitalWrite(m.inA, HIGH);
    analogWrite(m.en, m.speed);
  } else if (m.speed < 0) {   // reverse
    digitalWrite(m.inA, LOW);
    digitalWrite(m.inB, HIGH);
    analogWrite(m.en, -m.speed);
  } else {                    // off
    digitalWrite(m.inA, LOW);
    digitalWrite(m.inB, LOW);
  }
}

void driveMotor(Motor &m, int speed) {
  m.speed = speed;
  applyOutputs(m);
}

void stopMotorB() {
  pendingSpeed = 0;
  backingOff = -1;
  disarmed = -1;
  driveMotor(motorB, 0);
}

void setMotorA(int speed) {
  driveMotor(motorA, constrain(speed, -255, 255));
  Serial.print(F("motor A = ")); Serial.println(motorA.speed);
}

// Refuses to drive into a pressed switch whose end is already known.
// A pressed switch with an unknown end is assumed to be behind the motor;
// checkMotorB() stops it if the switch doesn't release in time.
void setMotorB(int speed) {
  speed = constrain(speed, -255, 255);
  stopMotorB();

  if (speed != 0) {
    for (uint8_t i = 0; i < 2; i++) {
      if (!limitActive(limits[i])) continue;
      if (limits[i].end == sign(speed)) {
        Serial.print(F("motor B: limit switch ")); Serial.print(limits[i].number);
        Serial.println(F(" pressed, refusing to drive into it"));
        return;
      }
      backingOff = disarmed = i;
      backoffStart = millis();
    }
  }

  driveMotor(motorB, speed);
  Serial.print(F("motor B = ")); Serial.println(motorB.speed);
}

void stopAll() {
  driveMotor(motorA, 0);
  stopMotorB();
  Serial.println(F("stop"));
}

void printStatus() {
  Serial.print(F("motor A  speed ")); Serial.println(motorA.speed);
  Serial.print(F("motor B  speed ")); Serial.print(motorB.speed);
  Serial.println(pendingSpeed != 0 ? F("  (reversing)") : F(""));
  for (LimitSwitch &l : limits) {
    Serial.print(F("limit switch ")); Serial.print(l.number);
    Serial.print(limitActive(l) ? F("  HIT (or wire broken)") : F("  clear"));
    if (l.end > 0)      Serial.println(F("  at the forward end"));
    else if (l.end < 0) Serial.println(F("  at the reverse end"));
    else                Serial.println(F("  end not known yet"));
  }
}

// -------- limit switch checks, every pass of loop() --------

void checkMotorB() {
  bool hit[2] = { limitActive(limits[0]), limitActive(limits[1]) };

  if (hit[0] && hit[1] && (motorB.speed != 0 || pendingSpeed != 0)) {
    stopMotorB();
    Serial.println(F("motor B: both limit switches active, stopped. Check the switch wiring."));
    return;
  }

  if (backingOff >= 0 && !hit[backingOff]) backingOff = -1;

  if (pendingSpeed != 0) {                    // coasting before reversing
    if (millis() - pauseStart >= REVERSE_PAUSE_MS) {
      driveMotor(motorB, pendingSpeed);
      pendingSpeed = 0;
      backoffStart = millis();
    }
    return;
  }

  int dir = sign(motorB.speed);
  if (dir == 0) return;

  for (uint8_t i = 0; i < 2; i++) {
    if (!hit[i] || i == disarmed) continue;
    // ran into switch i: it sits at the end this direction leads to
    limits[i].end = dir;
    pendingSpeed = -motorB.speed;
    pauseStart = millis();
    backingOff = disarmed = i;
    driveMotor(motorB, 0);
    Serial.print(F("motor B: limit switch ")); Serial.print(limits[i].number);
    Serial.print(F(" hit, reversing to ")); Serial.println(pendingSpeed);
    return;
  }

  if (backingOff >= 0 && millis() - backoffStart > BACKOFF_TIMEOUT_MS) {
    Serial.print(F("motor B: limit switch ")); Serial.print(limits[backingOff].number);
    Serial.println(F(" still pressed after backing off, stopped."));
    Serial.println(F("  It may be at the other end, or its wiring is broken."));
    stopMotorB();
  }
}

// hit / released messages, printed after checkMotorB() has already acted
void reportSwitch(LimitSwitch &l) {
  if (l.active == l.reported) return;
  l.reported = l.active;
  Serial.print(F("limit switch ")); Serial.print(l.number);
  Serial.println(l.active ? F(" HIT (or wire broken)") : F(" released"));
}

// -------- serial commands --------

void handleLine(char *cmd) {
  switch (cmd[0]) {
    case 's': stopAll();     break;
    case '?': printStatus(); break;
    case 'a': setMotorA(atoi(cmd + 1)); break;
    case 'b': setMotorB(atoi(cmd + 1)); break;
    default:
      Serial.println(F("? commands: a<speed>, b<speed>, s, ?   (speed -255..255)"));
      break;
  }
}

void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (lineLen > 0) {
        line[lineLen] = '\0';
        handleLine(line);
        lineLen = 0;
      }
    } else if (lineLen < sizeof(line) - 1) {
      line[lineLen++] = c;
    }
  }
}

// -------- sketch --------

void setup() {
  Motor *both[] = { &motorA, &motorB };
  for (Motor *m : both) {
    pinMode(m->en, OUTPUT);
    pinMode(m->inA, OUTPUT);
    pinMode(m->inB, OUTPUT);
    driveMotor(*m, 0);        // make sure both motors are off at boot
  }
  for (LimitSwitch &l : limits) {
    pinMode(l.pin, INPUT_PULLUP);
    l.active = l.reported = readRaw(l);
  }

  // Timer4 and Timer1 prescaler /8: ~3.9 kHz phase-correct PWM on D8 (ENA)
  // and D11 (ENB) (default is /64, ~490 Hz). Keeps the driver under 10 kHz.
  TCCR4B = (TCCR4B & 0b11111000) | 0x02;
  TCCR1B = (TCCR1B & 0b11111000) | 0x02;

  Serial.begin(9600);
  Serial.println(F("XY160D + limit switches ready"));
  Serial.println(F("Commands: a<speed>, b<speed>, s = stop, ? = status   (speed -255..255)"));
  printStatus();

  setMotorA(AUTO_SPEED_A);
  setMotorB(AUTO_SPEED_B);
}

// Keep loop() free of delay() so the switches are checked every pass.
void loop() {
  for (LimitSwitch &l : limits) updateSwitch(l);
  checkMotorB();
  for (LimitSwitch &l : limits) reportSwitch(l);
  readSerial();
}
