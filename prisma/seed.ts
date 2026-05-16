/**
 * NeuroLearn Database Seeder
 * Run: pnpm db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const USER_EMAIL = "aditya752907@gmail.com";

async function main() {
  console.log("🌱 Seeding NeuroLearn database...");

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: { streakDays: 7, totalXp: 2450, lastStudiedAt: new Date() },
    create: {
      email: USER_EMAIL,
      name: "Aditya",
      streakDays: 7,
      totalXp: 2450,
      lastStudiedAt: new Date(),
    },
  });
  console.log(`✓ User: ${user.email}`);

  // ─── Clean up old seed data ──────────────────────────────────────────────
  await prisma.subject.deleteMany({
    where: { id: { in: ["seed-biology-01", "seed-cs-01", "seed-crypto-01", "seed-vanet-01"] } },
  });

  // ─── Cryptography Subject ────────────────────────────────────────────────
  const crypto = await prisma.subject.create({
    data: {
      id: "seed-crypto-01",
      userId: user.id,
      name: "Cryptography",
      description: "Symmetric, asymmetric encryption, hashing and protocols",
      emoji: "🔐",
      color: "#f59e0b",
      examDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      cardCount: 0,
    },
  });

  const cryptoTopic1 = await prisma.topic.create({
    data: {
      id: "seed-topic-crypto-01",
      subjectId: crypto.id,
      name: "Symmetric Encryption",
      description: "AES, DES, block ciphers and stream ciphers",
      order: 0,
    },
  });

  const cryptoTopic2 = await prisma.topic.create({
    data: {
      id: "seed-topic-crypto-02",
      subjectId: crypto.id,
      name: "Asymmetric Encryption",
      description: "RSA, ECC, public key infrastructure",
      order: 1,
    },
  });

  const cryptoTopic3 = await prisma.topic.create({
    data: {
      id: "seed-topic-crypto-03",
      subjectId: crypto.id,
      name: "Hash Functions & MACs",
      description: "SHA, MD5, HMAC and digital signatures",
      order: 2,
    },
  });

  const cryptoCards1 = [
    {
      front: "What is the difference between a block cipher and a stream cipher?",
      back: "A block cipher encrypts fixed-size blocks of data (e.g. 128 bits in AES) using a key. A stream cipher encrypts data one bit or byte at a time, XORing with a keystream. Block ciphers are more common in practice; stream ciphers are faster for continuous data.",
      hint: "Think chunk vs continuous",
      easeFactor: 2.3, interval: 5, repetitions: 3,
    },
    {
      front: "What are the key sizes supported by AES?",
      back: "AES (Advanced Encryption Standard) supports three key sizes: 128-bit (10 rounds), 192-bit (12 rounds), and 256-bit (14 rounds). AES-128 is considered secure for most applications; AES-256 is used for top-secret data.",
      hint: "128, 192, 256",
      easeFactor: 2.5, interval: 7, repetitions: 4,
    },
    {
      front: "What is a padding oracle attack?",
      back: "A padding oracle attack exploits a system that reveals whether decrypted ciphertext has valid padding. An attacker can iteratively modify ciphertext and observe the padding error response to decrypt data byte by byte without the key. CBC mode is vulnerable.",
      hint: "CBC + error messages = dangerous",
      easeFactor: 1.8, interval: 1, repetitions: 1,
    },
    {
      front: "What is the difference between ECB and CBC mode?",
      back: "ECB (Electronic Codebook): each block encrypted independently — identical plaintext blocks produce identical ciphertext (insecure, shows patterns). CBC (Cipher Block Chaining): each block XORed with the previous ciphertext block before encryption — identical plaintext blocks produce different ciphertext.",
      hint: "CBC chains blocks together",
      easeFactor: 2.1, interval: 3, repetitions: 2,
    },
    {
      front: "What is a nonce and why is it important in cryptography?",
      back: "A nonce (Number used ONCE) is a random or pseudo-random value used only once in a cryptographic operation. It prevents replay attacks and ensures that the same plaintext encrypted twice produces different ciphertext. Used in AES-GCM, CTR mode, and challenge-response protocols.",
      hint: "Used once, prevents replay",
      easeFactor: 2.4, interval: 6, repetitions: 3,
    },
  ];

  const cryptoCards2 = [
    {
      front: "How does RSA encryption work?",
      back: "RSA uses a public key (n, e) and private key (n, d). Encryption: C = M^e mod n. Decryption: M = C^d mod n. Security relies on the difficulty of factoring large semi-primes. Key generation: choose two large primes p, q; n = p×q; e is coprime to φ(n); d = e⁻¹ mod φ(n).",
      hint: "M^e mod n",
      easeFactor: 1.7, interval: 1, repetitions: 1,
    },
    {
      front: "What is the Diffie-Hellman key exchange?",
      back: "Diffie-Hellman allows two parties to establish a shared secret over an insecure channel. Both agree on public parameters (prime p, generator g). Each picks a private key (a, b), exchanges public keys (g^a mod p, g^b mod p), and computes the shared secret: g^(ab) mod p.",
      hint: "g^ab mod p",
      easeFactor: 2.0, interval: 2, repetitions: 2,
    },
    {
      front: "What is a man-in-the-middle attack in the context of key exchange?",
      back: "In a MITM attack on key exchange, an attacker intercepts communications between Alice and Bob, establishing separate keys with each. Alice thinks she's talking to Bob and vice versa. Prevention: digital certificates, public key infrastructure (PKI), or pre-shared authentication.",
      hint: "Attacker intercepts key exchange",
      easeFactor: 2.2, interval: 4, repetitions: 3,
    },
    {
      front: "What is elliptic curve cryptography (ECC) and why is it preferred over RSA?",
      back: "ECC uses the algebraic structure of elliptic curves over finite fields. A 256-bit ECC key provides equivalent security to a 3072-bit RSA key. Advantages: smaller key sizes, faster computation, lower power consumption — ideal for mobile and IoT devices.",
      hint: "Same security, smaller keys",
      easeFactor: 1.9, interval: 1, repetitions: 1,
    },
  ];

  const cryptoCards3 = [
    {
      front: "What is the difference between SHA-256 and MD5?",
      back: "MD5 produces a 128-bit hash and is cryptographically broken (collision attacks exist). SHA-256 (part of SHA-2 family) produces a 256-bit hash and is currently secure. SHA-256 is used in TLS, Bitcoin, and digital signatures. MD5 is only suitable for checksums, not security.",
      hint: "MD5 is broken for security use",
      easeFactor: 2.5, interval: 8, repetitions: 5,
    },
    {
      front: "What is a collision attack on a hash function?",
      back: "A collision attack finds two different inputs that produce the same hash output: H(m1) = H(m2). This breaks the collision-resistance property. MD5 and SHA-1 are vulnerable. A birthday attack can find collisions in O(2^(n/2)) operations where n is the output size.",
      hint: "H(m1) = H(m2) where m1 ≠ m2",
      easeFactor: 2.0, interval: 2, repetitions: 2,
    },
    {
      front: "What is HMAC and how does it differ from a plain hash?",
      back: "HMAC (Hash-based Message Authentication Code) = H(K XOR opad || H(K XOR ipad || message)). Unlike a plain hash, HMAC requires a secret key, providing both integrity and authenticity. It prevents length extension attacks that affect plain SHA hashing.",
      hint: "Hash + secret key = authenticity",
      easeFactor: 2.1, interval: 3, repetitions: 2,
    },
  ];

  let cryptoCardCount = 0;
  for (const card of cryptoCards1) {
    await prisma.card.create({
      data: {
        topicId: cryptoTopic1.id,
        front: card.front, back: card.back, hint: card.hint,
        easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions,
        dueAt: new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000),
        avgQuality: 2.5 + Math.random(), reviewCount: card.repetitions + 1,
      },
    });
    cryptoCardCount++;
  }
  for (const card of cryptoCards2) {
    await prisma.card.create({
      data: {
        topicId: cryptoTopic2.id,
        front: card.front, back: card.back, hint: card.hint,
        easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions,
        dueAt: new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000),
        avgQuality: 2 + Math.random(), reviewCount: card.repetitions + 1,
      },
    });
    cryptoCardCount++;
  }
  for (const card of cryptoCards3) {
    await prisma.card.create({
      data: {
        topicId: cryptoTopic3.id,
        front: card.front, back: card.back, hint: card.hint,
        easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions,
        dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // due cards
        avgQuality: 2 + Math.random(), reviewCount: card.repetitions,
      },
    });
    cryptoCardCount++;
  }
  await prisma.subject.update({ where: { id: crypto.id }, data: { cardCount: cryptoCardCount, masteryPct: 45 } });
  console.log(`✓ Subject: ${crypto.name} (${cryptoCardCount} cards)`);

  // ─── VANET Subject ───────────────────────────────────────────────────────
  const vanet = await prisma.subject.create({
    data: {
      id: "seed-vanet-01",
      userId: user.id,
      name: "VANET Research",
      description: "Vehicular Ad-hoc Networks — congestion and security",
      emoji: "🚗",
      color: "#3b82f6",
      cardCount: 0,
    },
  });

  const vanetTopic1 = await prisma.topic.create({
    data: {
      id: "seed-topic-vanet-01",
      subjectId: vanet.id,
      name: "Congestion Control",
      description: "CI, CRS models and traffic management",
      order: 0,
    },
  });

  const vanetTopic2 = await prisma.topic.create({
    data: {
      id: "seed-topic-vanet-02",
      subjectId: vanet.id,
      name: "VANET Security",
      description: "Attacks, trust models and authentication",
      order: 1,
    },
  });

  const vanetCards1 = [
    {
      front: "What is the Congestion Index (CI) in VANET?",
      back: "The Congestion Index (CI) is a metric that quantifies traffic density on a road segment. CI = (current vehicle density) / (maximum vehicle density). CI ranges from 0 (free flow) to 1 (fully congested). Used to trigger rerouting decisions in VANET congestion control protocols.",
      hint: "Ratio of current to max density",
      easeFactor: 2.4, interval: 5, repetitions: 4,
    },
    {
      front: "What is the Congestion Resolution Score (CRS)?",
      back: "CRS evaluates the effectiveness of a congestion resolution action. It combines factors like travel time reduction, PDR (Packet Delivery Ratio) improvement, and collision probability decrease. Higher CRS indicates a more effective resolution strategy.",
      hint: "Composite score of resolution effectiveness",
      easeFactor: 2.2, interval: 4, repetitions: 3,
    },
    {
      front: "How does vehicle density affect Packet Delivery Ratio (PDR) in VANETs?",
      back: "At low density: PDR is low due to sparse connectivity and frequent link breaks. At medium density: PDR peaks as enough nodes relay packets without excessive collision. At high density: PDR drops due to channel congestion, collisions, and the hidden terminal problem.",
      hint: "Inverted U-curve relationship",
      easeFactor: 2.0, interval: 2, repetitions: 2,
    },
    {
      front: "What is the SUMO simulator used for in VANET research?",
      back: "SUMO (Simulation of Urban MObility) is an open-source traffic simulation tool used to generate realistic vehicular mobility traces. In VANET research, SUMO outputs vehicle positions/speeds over time, which are fed into network simulators like NS3 or OMNET++ to simulate communication.",
      hint: "Traffic mobility traces",
      easeFactor: 2.5, interval: 7, repetitions: 5,
    },
    {
      front: "What is the hidden terminal problem in VANETs?",
      back: "The hidden terminal problem occurs when two nodes (A and C) are both in range of a common node (B) but not of each other. Both A and C transmit to B simultaneously, causing a collision at B. Solved by RTS/CTS (Request to Send/Clear to Send) handshake in IEEE 802.11.",
      hint: "A and C can't hear each other but both reach B",
      easeFactor: 2.1, interval: 3, repetitions: 2,
    },
  ];

  const vanetCards2 = [
    {
      front: "What are the main security attacks in VANETs?",
      back: "Key attacks: Sybil attack (one node fakes multiple identities), replay attack (resends old messages), black hole attack (drops all packets), Denial of Service (floods channel), and position falsification (broadcasts false GPS location). All exploit the open wireless medium and high mobility.",
      hint: "Sybil, replay, black hole, DoS",
      easeFactor: 2.3, interval: 5, repetitions: 3,
    },
    {
      front: "What is a Sybil attack and how is it prevented in VANETs?",
      back: "A Sybil attacker creates multiple fake vehicle identities to gain disproportionate influence over the network (e.g., fake congestion reports). Prevention: PKI-based certificates (each vehicle gets one cert), position verification using roadside units (RSUs), and trust-based detection algorithms.",
      hint: "One node, many fake identities",
      easeFactor: 1.9, interval: 1, repetitions: 1,
    },
    {
      front: "What is the role of RSUs in VANET infrastructure?",
      back: "Roadside Units (RSUs) are fixed infrastructure nodes placed along roads. They provide: internet connectivity to vehicles, local information (speed limits, hazards), certificate revocation for security, and anchor points for position verification. RSUs bridge VANETs with the internet.",
      hint: "Fixed infrastructure nodes on roadsides",
      easeFactor: 2.4, interval: 6, repetitions: 4,
    },
  ];

  let vanetCardCount = 0;
  for (const card of vanetCards1) {
    await prisma.card.create({
      data: {
        topicId: vanetTopic1.id,
        front: card.front, back: card.back, hint: card.hint,
        easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions,
        dueAt: new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000),
        avgQuality: 3 + Math.random(), reviewCount: card.repetitions + 1,
      },
    });
    vanetCardCount++;
  }
  for (const card of vanetCards2) {
    await prisma.card.create({
      data: {
        topicId: vanetTopic2.id,
        front: card.front, back: card.back, hint: card.hint,
        easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions,
        dueAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // due soon
        avgQuality: 2.5 + Math.random(), reviewCount: card.repetitions,
      },
    });
    vanetCardCount++;
  }
  await prisma.subject.update({ where: { id: vanet.id }, data: { cardCount: vanetCardCount, masteryPct: 62 } });
  console.log(`✓ Subject: ${vanet.name} (${vanetCardCount} cards)`);

  // ─── Revision Sessions ───────────────────────────────────────────────────
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    await prisma.revisionSession.create({
      data: {
        userId: user.id,
        mode: i % 3 === 0 ? "EMERGENCY" : "NORMAL",
        startedAt: date,
        completedAt: new Date(date.getTime() + (15 + Math.random() * 20) * 60 * 1000),
        cardsReviewed: Math.floor(10 + Math.random() * 15),
        xpEarned: Math.floor(50 + Math.random() * 100),
      },
    });
  }
  console.log("✓ Revision sessions seeded (7 days)");

  // ─── Quiz Sessions ───────────────────────────────────────────────────────
  await prisma.quizSession.create({
    data: {
      userId: user.id,
      subjectId: crypto.id,
      mode: "STANDARD",
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000),
      totalCards: 8,
      correctCount: 6,
      score: 75,
    },
  });
  await prisma.quizSession.create({
    data: {
      userId: user.id,
      subjectId: vanet.id,
      mode: "TIMED",
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
      totalCards: 6,
      correctCount: 5,
      score: 83,
      timeLimitSec: 600,
    },
  });
  console.log("✓ Quiz sessions seeded");

  // ─── Analytics Events ────────────────────────────────────────────────────
  const eventTypes = ["card.reviewed", "quiz.completed", "revision.completed", "subject.created", "file.uploaded"];
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const eventDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        event: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        props: {
          count: Math.floor(Math.random() * 10) + 1,
          score: Math.floor(60 + Math.random() * 40),
          subject: Math.random() > 0.5 ? "Cryptography" : "VANET Research",
        },
        createdAt: eventDate,
      },
    });
  }
  console.log("✓ Analytics events seeded (30 events)");

  console.log("\n✅ Seeding complete!");
  console.log(`Subjects: Cryptography (${cryptoCardCount} cards), VANET Research (${vanetCardCount} cards)`);
  console.log(`Total cards: ${cryptoCardCount + vanetCardCount}`);
  console.log(`Revision sessions: 7 | Quiz sessions: 2 | Analytics events: 30`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });