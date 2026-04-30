import { prisma } from "@ru/db";

const PLAN_MAP: Record<string, string> = {
  "Both-Annual": "plan_bundle_annual",
  "Mukha Mudra-Annual": "plan_face_annual",
  "Pranayama-Annual": "plan_pranayama_annual",
  "Mukha Mudra-Monthly": "plan_face_monthly",
  "Pranayama-Monthly": "plan_pranayama_monthly",
};

const AMOUNT_MAP: Record<string, number> = {
  "Both-Annual": 600000,
  "Mukha Mudra-Annual": 300000,
  "Pranayama-Annual": 300000,
  "Mukha Mudra-Monthly": 111100,
  "Pranayama-Monthly": 111100,
};

interface Member {
  name: string;
  email: string;
  phone: string;
  program: string;
  type: string;
  joined: Date;
  ends: Date;
}

const MEMBERS: Member[] = [
  { name: "Akshma Gupta", email: "Neha.agsons@gmail.com", phone: "+919971407461", program: "Both", type: "Annual", joined: new Date("2026-02-17"), ends: new Date("2027-02-17") },
  { name: "Alfa Srichandan", email: "srichandanalfa@gmail.com", phone: "+917978318200", program: "Both", type: "Annual", joined: new Date("2026-02-18"), ends: new Date("2027-02-18") },
  { name: "Anjana Mahajan", email: "mahajananjana486@gmail.com", phone: "+919814334284", program: "Both", type: "Annual", joined: new Date("2026-04-04"), ends: new Date("2027-04-04") },
  { name: "Apoorva Manjunath", email: "Apoorvamj18@gmail.com", phone: "+919535275734", program: "Mukha Mudra", type: "Monthly", joined: new Date("2026-03-30"), ends: new Date("2026-04-29") },
  { name: "Archna Dhamija", email: "archna.dhamija1@gmail.com", phone: "+919006020271", program: "Both", type: "Annual", joined: new Date("2026-02-26"), ends: new Date("2027-02-26") },
  { name: "Ashna Katoch", email: "ashnakatoch@gmail.com", phone: "+919711542909", program: "Pranayama", type: "Monthly", joined: new Date("2026-04-20"), ends: new Date("2026-05-20") },
  { name: "Avanti Annigeri", email: "annigeriavanti@gmail.com", phone: "+4917626129691", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-03-10"), ends: new Date("2027-03-10") },
  { name: "Bhawna Jain", email: "Jbhawna@gmail.com", phone: "+918368220295", program: "Both", type: "Annual", joined: new Date("2026-03-23"), ends: new Date("2027-03-23") },
  { name: "Bindiya MT", email: "bindiyathippeswamy@gmail.com", phone: "+918861952086", program: "Both", type: "Annual", joined: new Date("2026-02-10"), ends: new Date("2027-02-10") },
  { name: "Carina Hub", email: "carinacecile@gmail.com", phone: "+491711777818", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-01"), ends: new Date("2027-02-01") },
  { name: "Carl Arsenault", email: "Carlarsenault83@gmail.com", phone: "+14385028083", program: "Both", type: "Annual", joined: new Date("2026-02-22"), ends: new Date("2027-02-22") },
  { name: "Chandramathi Ramaswamy", email: "chandramathiramaswamy@gmail.com", phone: "+919487804414", program: "Both", type: "Annual", joined: new Date("2026-02-13"), ends: new Date("2027-02-13") },
  { name: "Darshana Ashok Shetty", email: "Darshanashetty009@gmail.com", phone: "+919769121550", program: "Both", type: "Annual", joined: new Date("2026-03-22"), ends: new Date("2027-03-22") },
  { name: "Devi Kothapalli", email: "devikothapalli30@gmail.com", phone: "+919373388888", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-20"), ends: new Date("2027-04-20") },
  { name: "Gagana Ravindran", email: "gaganaravindran@gmail.com", phone: "+919886056363", program: "Mukha Mudra", type: "Monthly", joined: new Date("2026-03-25"), ends: new Date("2026-04-24") },
  { name: "Harshita", email: "harshitakhanna91@gmail.com", phone: "+916900182516", program: "Mukha Mudra", type: "Monthly", joined: new Date("2026-04-04"), ends: new Date("2026-05-04") },
  { name: "Hemalatha", email: "hlg170893@gmail.com", phone: "+918722534273", program: "Both", type: "Annual", joined: new Date("2026-02-27"), ends: new Date("2027-02-27") },
  { name: "Isaac Hub", email: "steffen.isaac.hub@gmail.com", phone: "+15149678083", program: "Both", type: "Annual", joined: new Date("2026-02-01"), ends: new Date("2027-02-01") },
  { name: "Jaspreet Sahota", email: "jaspreet.sahota87@gmail.com", phone: "+18134636180", program: "Both", type: "Annual", joined: new Date("2026-04-23"), ends: new Date("2027-04-23") },
  { name: "Jyoti Sharma", email: "radhaji.82@gmail.com", phone: "+919560338730", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-04"), ends: new Date("2027-04-04") },
  { name: "Jyotsna Bhati", email: "jyotsnabhati.92@gmail.com", phone: "+919116136138", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-03"), ends: new Date("2027-04-03") },
  { name: "K. Manjula", email: "formanjulak@gmail.com", phone: "+917382661461", program: "Both", type: "Annual", joined: new Date("2026-03-11"), ends: new Date("2027-03-11") },
  { name: "Karin Hahmann Hub", email: "karin.hahmann.hub@googlemail.com", phone: "+491726758102", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-01"), ends: new Date("2027-02-01") },
  { name: "Kinjal Saurabh", email: "kinjalsaurabh15@gmail.com", phone: "+918114786826", program: "Both", type: "Annual", joined: new Date("2026-02-28"), ends: new Date("2027-02-28") },
  { name: "Krishna Kumari", email: "krishnakumari.krish11@gmail.com", phone: "+918754315437", program: "Both", type: "Annual", joined: new Date("2026-03-23"), ends: new Date("2027-03-23") },
  { name: "Latha M R", email: "lathamanibettu.r@gmail.com", phone: "+919019097289", program: "Pranayama", type: "Annual", joined: new Date("2026-04-20"), ends: new Date("2027-04-20") },
  { name: "Madhur", email: "madhurjava@gmail.com", phone: "+919892023654", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-04"), ends: new Date("2027-02-04") },
  { name: "Manju Singh", email: "manjusinghlko10@gmail.com", phone: "+919454944614", program: "Pranayama", type: "Annual", joined: new Date("2026-02-14"), ends: new Date("2027-02-14") },
  { name: "Meenakshi Singh", email: "meenakshisingh@capsul.co.in", phone: "+919663080825", program: "Both", type: "Annual", joined: new Date("2026-02-10"), ends: new Date("2027-02-10") },
  { name: "Melanie Fernandes", email: "melanieonline@gmail.com", phone: "+919740195915", program: "Both", type: "Annual", joined: new Date("2026-03-06"), ends: new Date("2027-03-06") },
  { name: "Mohini Maheshwari", email: "mohinimaheshwari20@gmail.com", phone: "+919967532553", program: "Both", type: "Annual", joined: new Date("2026-03-03"), ends: new Date("2027-03-03") },
  { name: "Mukti Krishan", email: "mukti.krishan@gmail.com", phone: "+919930847931", program: "Both", type: "Annual", joined: new Date("2026-02-15"), ends: new Date("2027-02-15") },
  { name: "Nalini Pujari", email: "Naliniagnur@gmail.com", phone: "+919972374209", program: "Both", type: "Annual", joined: new Date("2026-02-11"), ends: new Date("2027-02-11") },
  { name: "Nandini Sharma", email: "nandinisharmawork@gmail.com", phone: "+919266623769", program: "Pranayama", type: "Annual", joined: new Date("2026-03-30"), ends: new Date("2027-03-30") },
  { name: "Natalia Ilyina", email: "nilyinach@gmail.com", phone: "+41794520126", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-14"), ends: new Date("2027-04-14") },
  { name: "Neeta Kachalia", email: "neetakachalia@gmail.com", phone: "+919819429750", program: "Both", type: "Annual", joined: new Date("2026-03-30"), ends: new Date("2027-03-30") },
  { name: "Nithya Sathyanarayana", email: "nithya.snarayana@gmail.com", phone: "+918105094941", program: "Pranayama", type: "Annual", joined: new Date("2026-04-22"), ends: new Date("2027-04-22") },
  { name: "Nomita", email: "nomita.b@gmail.com", phone: "+919042062994", program: "Pranayama", type: "Annual", joined: new Date("2026-03-30"), ends: new Date("2027-03-30") },
  { name: "Olena", email: "elenakramdada@gmail.com", phone: "+380632137757", program: "Mukha Mudra", type: "Monthly", joined: new Date("2026-04-24"), ends: new Date("2026-05-24") },
  { name: "Palmi Shah", email: "palmishah01@gmail.com", phone: "+917666515773", program: "Both", type: "Annual", joined: new Date("2026-02-24"), ends: new Date("2027-02-24") },
  { name: "Pooja Chawla", email: "chawla.poojapujara@gmail.com", phone: "+919818374474", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-15"), ends: new Date("2027-02-15") },
  { name: "Pratyusha", email: "Pratyusha177@gmail.com", phone: "+917680016977", program: "Both", type: "Annual", joined: new Date("2026-02-15"), ends: new Date("2027-02-15") },
  { name: "Pritee Lalit Swaroop", email: "Pritunish263@gmail.com", phone: "+919970427331", program: "Both", type: "Annual", joined: new Date("2026-04-04"), ends: new Date("2027-04-04") },
  { name: "Ritu", email: "ritusaketverma07@gmail.com", phone: "+919008840541", program: "Both", type: "Annual", joined: new Date("2026-03-06"), ends: new Date("2027-03-06") },
  { name: "Roohee Peerzada", email: "peerzadaroohee@gmail.com", phone: "+12677212400", program: "Both", type: "Annual", joined: new Date("2026-04-12"), ends: new Date("2027-04-12") },
  { name: "Rosey Stone", email: "stonerosey7@gmail.com", phone: "+66946276894", program: "Both", type: "Annual", joined: new Date("2026-02-05"), ends: new Date("2027-02-05") },
  { name: "Sakshi Bansode", email: "sakshi.bansode.10@gmail.com", phone: "+919930366073", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-04"), ends: new Date("2027-02-04") },
  { name: "Sangeetha Nair", email: "nairsangeetha02@gmail.com", phone: "+918383017141", program: "Both", type: "Annual", joined: new Date("2026-02-14"), ends: new Date("2027-02-14") },
  { name: "Sarita Reddy", email: "anvisamona@yahoo.com", phone: "+919885463694", program: "Both", type: "Annual", joined: new Date("2026-03-30"), ends: new Date("2027-03-30") },
  { name: "Seema Poddar", email: "shri.seemapoddar@gmail.com", phone: "+918657356555", program: "Both", type: "Annual", joined: new Date("2026-03-12"), ends: new Date("2027-03-12") },
  { name: "Sheetal Kale", email: "shetalkale@gmail.com", phone: "+919930406561", program: "Both", type: "Annual", joined: new Date("2026-02-13"), ends: new Date("2027-02-13") },
  { name: "Sheetal Kshatriya", email: "sheetalmk@gmail.com", phone: "+14165206900", program: "Pranayama", type: "Monthly", joined: new Date("2026-04-06"), ends: new Date("2026-05-06") },
  { name: "Shivangini Swaraj", email: "shivanginiiswaraj05@gmail.com", phone: "+916203213311", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-15"), ends: new Date("2027-04-15") },
  { name: "Shravya Kunder", email: "shravyakunder@gmail.com", phone: "+919845441041", program: "Mukha Mudra", type: "Monthly", joined: new Date("2026-04-01"), ends: new Date("2026-05-01") },
  { name: "Shreyasi Agrawal", email: "shreyasiagrawal7@gmail.com", phone: "+919920348199", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-04"), ends: new Date("2027-04-04") },
  { name: "Shweta", email: "shwetatiwadi11@gmail.com", phone: "+918888974545", program: "Both", type: "Annual", joined: new Date("2026-03-29"), ends: new Date("2027-03-29") },
  { name: "Sini Sivasankaran", email: "sini.siva@gmail.com", phone: "+918939802846", program: "Both", type: "Annual", joined: new Date("2026-02-21"), ends: new Date("2027-02-21") },
  { name: "Sireesha Goud", email: "psireepharmacy@gmail.com", phone: "+96566778301", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-14"), ends: new Date("2027-04-14") },
  { name: "Sneha Devaraj", email: "snehadevaraj@gmail.com", phone: "+919886199770", program: "Both", type: "Annual", joined: new Date("2026-03-16"), ends: new Date("2027-03-16") },
  { name: "Sowmya Raman", email: "Raman.sowmya@gmail.com", phone: "+919632773781", program: "Both", type: "Annual", joined: new Date("2026-03-21"), ends: new Date("2027-03-21") },
  { name: "Suchitra Ajit Ghodke", email: "suchi6861@gmail.com", phone: "+918169832596", program: "Both", type: "Annual", joined: new Date("2026-03-30"), ends: new Date("2027-03-30") },
  { name: "Sugi (G. Suganyadevi)", email: "varunsugi@gmail.com", phone: "+918300898137", program: "Both", type: "Annual", joined: new Date("2026-02-10"), ends: new Date("2027-02-10") },
  { name: "Swathi M N V", email: "swathi.mnv@gmail.com", phone: "+919704466466", program: "Both", type: "Annual", joined: new Date("2026-03-01"), ends: new Date("2027-03-01") },
  { name: "Tamizh", email: "pearlseducation@gmail.com", phone: "+919952070819", program: "Both", type: "Annual", joined: new Date("2026-03-08"), ends: new Date("2027-03-08") },
  { name: "Tejinder Sandhu", email: "tejindersandhu111@gmail.com", phone: "+916581867630", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-16"), ends: new Date("2027-04-16") },
  { name: "Vaishali Deshmukh", email: "vkondhare9@gmail.com", phone: "+917262029029", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-04"), ends: new Date("2027-02-04") },
  { name: "Vandana Saxena", email: "Vandanaloreto@gmail.com", phone: "+919818000865", program: "Both", type: "Annual", joined: new Date("2026-02-04"), ends: new Date("2027-02-04") },
  { name: "Vathsala Cr", email: "vats.kalarava@gmail.com", phone: "", program: "Both", type: "Annual", joined: new Date("2026-01-01"), ends: new Date("2027-01-01") },
  { name: "Vidisha Goyal", email: "vidishagoyal9@gmail.com", phone: "+919149087149", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-22"), ends: new Date("2027-02-22") },
  { name: "Vidushi Sharma", email: "vidushi.sharmam365@gmail.com", phone: "+919899207399", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-04"), ends: new Date("2027-04-04") },
  { name: "Vignesh", email: "sharoh1996@gmail.com", phone: "+353894028938", program: "Both", type: "Annual", joined: new Date("2026-04-04"), ends: new Date("2027-04-04") },
  { name: "Vijaya Madhavi M", email: "vijayamadhavi08@gmail.com", phone: "+918088045999", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-02-27"), ends: new Date("2027-02-27") },
  { name: "Vijaya Pandey", email: "vijayapandey@gmail.com", phone: "+919811600579", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-03-01"), ends: new Date("2027-03-01") },
  { name: "Viridiana", email: "viri.munguia@gmail.com", phone: "+919187159873", program: "Both", type: "Annual", joined: new Date("2026-03-13"), ends: new Date("2027-03-13") },
  { name: "Yamini Chhibber", email: "yaminichibber@gmail.com", phone: "+918930454708", program: "Mukha Mudra", type: "Annual", joined: new Date("2026-04-27"), ends: new Date("2027-04-27") },
];

async function run() {
  let seeded = 0;
  let skipped = 0;
  let errors = 0;

  for (const member of MEMBERS) {
    const planKey = `${member.program === "Both" ? "Both" : member.program === "Mukha Mudra" ? "Mukha Mudra" : "Pranayama"}-${member.type}`;
    const planId = PLAN_MAP[planKey];
    const amountPaise = AMOUNT_MAP[planKey] ?? 300000;

    if (!planId) {
      console.log(`❌ Unknown plan for ${member.name}: ${planKey}`);
      errors++;
      continue;
    }

    try {
      const user = await prisma.user.upsert({
        where: { email: member.email.toLowerCase() },
        update: { name: member.name, phone: member.phone || undefined },
        create: {
          email: member.email.toLowerCase(),
          name: member.name,
          phone: member.phone || undefined,
          role: "USER",
          timezone: "Asia/Kolkata",
          onboardedAt: member.joined,
          termsAcceptedAt: member.joined,
        },
      });

      const existing = await prisma.membership.findFirst({ where: { userId: user.id } });
      if (existing) {
        await prisma.membership.update({
          where: { id: existing.id },
          data: { planId, status: "ACTIVE", periodStart: member.joined, periodEnd: member.ends },
        });
      } else {
        await prisma.membership.create({
          data: { userId: user.id, planId, status: "ACTIVE", periodStart: member.joined, periodEnd: member.ends },
        });
      }

      const existingOrder = await prisma.order.findFirst({ where: { userId: user.id } });
      if (!existingOrder) {
        await prisma.order.create({
          data: {
            userId: user.id,
            planId,
            razorpayOrderId: `manual_import_${user.id}`,
            amountPaise,
            currency: "INR",
            status: "PAID",
            paidAt: member.joined,
            metadata: { source: "manual_import" },
          },
        });
      }

      console.log(`✅ ${member.name} (${planKey})`);
      seeded++;
    } catch (err) {
      console.error(`❌ Failed for ${member.name}:`, err);
      errors++;
    }
  }

  console.log(`\n🎉 Done! Seeded: ${seeded}, Skipped: ${skipped}, Errors: ${errors}`);
  await prisma.$disconnect();
}

run().catch(console.error);
