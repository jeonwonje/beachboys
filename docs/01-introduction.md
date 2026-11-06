# 1. Introduction

*ASI-301 Engineering Report · Section 1*

[Contents](../README.md) · [Next: Section 2, Requirements](02-requirements.md)

Numbers in square brackets are the report's reference numbers. Section 1.6 lists them.

## 1.1 Problem

About 97% of the plastic litter on Singapore's beaches arrives from offshore [1], so it must be cleared daily.

A beach cleaning contractor, called "the contractor" in these documents, cleans Tanjong, Siloso and Palawan beaches on Sentosa. It has about 20 workers, split roughly evenly between manual collection and machinery [3]. Tractor-towed sieves clear the dry sand. Workers clear the wet band by hand. The wet band is the wet intertidal band, the strip of shore between the high and low tide marks.

This project addresses five of the contractor's six pain points (Table A.1):

- the strain of lifting piles in the heat
- tractor noise, which limits machinery to quiet periods
- sieves that fail on wet sand
- loose terrain
- small items that are hard to spot

The contractor plans to buy more tractors. Its staff called this plan a band-aid [3]. The report states that the plan faces the same limits.

The Semester 2 target is a module that collects and separates the debris in Table 1 from dry and wet-band sand. The module must do this with less lifting than manual clearing, alongside the contractor's tractors and crew.

| Class | Description |
|---|---|
| Small | Small and rigid, smallest dimension under 3 cm |
| Medium | Medium rigid, smallest dimension 3 cm or more, top of the 1 to 30 cm size range |
| Long | Long, pliable or stiff |
| Flat | Low profile flat |

*Table 1: Classes of trash targeted (Appendix B).*

These documents use three names for the hardware:

- **BeachBoy** is the whole machine.
- **Module** is the payload parts, excluding the carrier.
- **Carrier** is the Botsync Copernicus electric base.

Source: Report Section 1.1, Table 1, Executive Summary, Glossary.

## 1.2 Technical review of current solutions

The review covers two machines, and each machine gives one design gap.

### 1.2.1 SUTD SAND-E

The ASI-301 team interviewed the SAND-E team and assessed the prototype ([Section 1.4](#14-sand-e-interview-notes)). SAND-E uses polycarbonate and aluminium that are low-cost but exposure-resistant. These materials guided the material choices of this project.

Only the front rake and the trash storage detach. The rest of the machine is integrated. The report judges that this design is hard to clean or maintain on the beach.

**Gap 1: maintainability.**

### 1.2.2 The Searial Cleaners' BeBot

The BeBot is the only commercial beach-cleaning robot in Singapore. It sifts the top 10 cm of sand into a 100 L bin [4]. The contractor trialled and rejected the BeBot [3], [5] for these reasons:

- It tipped when loaded.
- It held too little.
- It cost about twice a tractor's price.

The ASI-301 team also expects the BeBot to fail on wet sand. Wet sand clumps [6] and blinds the mesh [7], [8]. Sieve blinding is the failure mode in which wet particles adhere to mesh wires and block the apertures.

**Gap 2: wet sand.**

### 1.2.3 Gaps carried into the requirements

| Gap | Name | Machine reviewed | Requirements in Table 2 |
|---|---|---|---|
| Gap 1 | Maintainability | SUTD SAND-E | D7 |
| Gap 2 | Wet sand | BeBot | D1, D2 |

Source: Report Section 1.2, Section 1.3 (Table 2), Appendix C.2, Glossary.

## 1.3 The contractor's workflow and pain points

### 1.3.1 Workflow

The contractor clears debris with manual labour and with tractors. About 20 workers cover the three beaches from 0700 to 1900. Tractors run twice a day, in low-footfall periods. November to December and June to July are the peak seasons, when management staff may join the cleaning crews.

Large debris follows this sequence:

1. Workers sweep debris and flotsam into piles or trash bags.
2. Workers lift each pile by hand into a tractor bucket.
3. The tractor carries the debris to the roadside.
4. Workers transfer the debris into a utility vehicle.
5. The utility vehicle carries the debris to the open-top containers.

Workers lift the piles by hand because scooping directly with the bucket also collects large volumes of sand.

Small debris follows this sequence:

1. A tractor drags a sieve attachment through the sand.
2. Small debris collects at the rear of the sieve.
3. When the sieve is full, it is emptied onto the beach.
4. Workers move the debris to the utility vehicle by hand.

### 1.3.2 Pain points

The contractor identified six pain points during the operations interview. Table A.1 gives them in the contractor's order of priority.

| No. | Pain point | System response |
|---|---|---|
| 1 | Physically strenuous work: constant bending in heat, with mandatory rest breaks. Transferring debris into the bucket or utility vehicle is the most tiring task. | BeachBoy deposits debris into an onboard bin, so workers lift one bin instead of many individual piles. |
| 2 | High attachment maintenance: hydraulic pipe bursts and sieve wear from daily use. | The modular design allows quick release of core subsystems for maintenance. |
| 3 | The sieve fails on wet sand and on larger debris. | Primary target. The trommel half-drum (half-drum) separates sand by tumbling instead of gravity sieving (Report Section 2.1). |
| 4 | Tractor noise limits operation to low-crowd periods. | The fully electric system reduces the amount of noise produced. |
| 5 | Loose sand at Palawan is the most difficult terrain. | The carrier is an all-terrain wheeled robot, with locomotion tested over loose sand. |
| 6 | Small scattered debris (cable ties, bolts, coins) is hard to spot and collect. | The conveyor has spokes with mesh that dig into the sand, collecting smaller items that workers may miss. |

*Table A.1: The contractor's pain points, in the contractor's order of priority, and system response.*

Report Section 1.1 lists points 1, 3, 4, 5 and 6 as the five that this project addresses. Table A.1 also gives a system response to point 2.

Wet Bulb Globe Temperature (WBGT) is a heat-stress index. Above 32 °C, it triggers the mandatory rest breaks that remove workers from the sand.

Source: Report Appendix A, Table A.1, Appendix C.1, Glossary.

## 1.4 SAND-E interview notes

The ASI-301 team visited the SAND-E team at the Singapore University of Technology and Design on 2 April 2026. The table below gives the notes that matter to this project.

| Topic | Note |
|---|---|
| Problem validation | The SAND-E team saw a lot of litter on Changi beach even with cleaners working there. |
| Operator input | The team did not work with any cleaning operator on how SAND-E would fit into their operations. Engineering constraints alone set the types of debris that it collected. |
| Design priorities | Modular, swappable parts. Plastic over metal to avoid salt-water corrosion. Easy maintenance, with a focus on hot-swapping parts of the track and the gear teeth. |
| Detachable parts | Only the front rake and the trash storage detach. The rest of the machine is integrated. |
| Collection | In the video demonstration, the rake did not dig in. Its bristles only scraped the surface. It collected debris that lay on the sand. Whether it can collect buried debris is uncertain. |
| Next steps | The team wants to keep production cost low so that the robot can scale commercially. Autonomous operation is on its roadmap, with GPS, phone control and one operator for several units. |

Source: Report Appendix C.2.

## 1.5 Debris classes

Table B.1 gives the full breakdown of debris categories. Table 1 lists the four classes that BeachBoy targets. Heavy bulky objects (class 4) stay manual.

| Class | Description | Examples |
|---|---|---|
| Small | Small rigid, smallest dimension under 3 cm | Cigarette butts, bottle caps, lighters, straws and plastic cutlery, cable ties, hard plastic and styrofoam fragments, bolts, coins |
| Medium | Medium rigid, smallest dimension 3 cm or more, top of the 1 to 30 cm size range | Plastic drink bottles, aluminium drink cans, glass bottles, plastic cups, styrofoam and plastic takeaway containers, drink cartons |
| Long | Long, pliable or stiff | Rope, fishing line, net fragments, strapping bands, raffia string, seaweed, driftwood sticks and branches |
| Flat | Low profile flat | Food and snack wrappers, plastic bags, plastic film and sheet fragments, sachets, cardboard and paper, face masks, flip-flops |
| 4 | Heavy bulky objects | Driftwood logs, tyres, large styrofoam blocks and fish boxes, ghost nets, pallets, jerrycans and drums, mattresses |

*Table B.1: Full breakdown of debris categories.*

Source: Report Appendix B, Table B.1, Glossary.

## 1.6 References

The numbers match the report's reference list. This section does not list reference [2].

- [1] Z. Lim, "97% of plastic trash on Singapore's beaches originate from offshore sources: NEA study," The Straits Times, Jan. 15, 2025. [Online]. Available: <https://www.straitstimes.com/singapore/environment/97-of-plastic-trash-on-singapores-beaches-originate-from-offshore-sources-nea-study> (accessed Nov. 4, 2026).
- [3] Contractor operations manager, site visit and interview, Sentosa, Singapore, Apr. 2, 2026. Notes in Report Appendix C.1.
- [4] R. Noe, "The BeBot beach cleaning robot," Core77, Jul. 29, 2022. [Online]. Available: <https://www.core77.com/posts/116424/The-BeBot-Beach-Cleaning-Robot> (accessed Nov. 4, 2026).
- [5] C. Vazquez, "Keep Euclid Beautiful brings Bebot to Sims Park," The Euclid Observer, Aug. 1, 2023. [Online]. Available: <https://www.theeuclidobserver.com/articles/keep-euclid-beautiful-brings-bebot-to-sims-park/> (accessed Nov. 4, 2026).
- [6] N. Mitarai and F. Nori, "Wet granular materials," Advances in Physics, vol. 55, no. 1-2, pp. 1-45, 2006, doi: 10.1080/00018730600626065.
- [7] R. O'Connell, "Sieve use in the pharmaceutical industry," Pharmaceutical Technology, May 1, 2005. [Online]. Available: <https://www.pharmtech.com/view/sieve-use-pharmaceutical-industry> (accessed Nov. 4, 2026).
- [8] H. Barber & Sons, "Sand sifting machines." [Online]. Available: <https://www.hbarber.com/sand-sifting-machines/> (accessed Nov. 4, 2026).

Source: Report References.

[Contents](../README.md) · [Next: Section 2, Requirements](02-requirements.md)
