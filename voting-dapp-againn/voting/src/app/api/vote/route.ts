import {
  ActionGetResponse,
  ActionPostRequest,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { Voting } from "@/../anchor/target/types/voting";

const IDL = require("@/../anchor/target/idl/voting.json");

/* =========================
   OPTIONS (CORS PREFLIGHT)
   ========================= */
export const OPTIONS = GET;

/* =========================
   GET → ACTION METADATA
   ========================= */
export async function GET(_request: Request) {
  const metadata: ActionGetResponse = {
    icon: "https://zestfulkitchen.com/wp-content/uploads/2021/09/Peanut-butter_hero_for-web-2.jpg",
    title: "Vote for your favorite peanut butter!",
    description: "Vote between Crunchy and Smooth peanut butter.",
    label: "Vote",
    links: {
      actions: [
        {
          label: "Vote for Crunchy",
          href: "/api/vote?candidate=Crunchy",
          type: "transaction",
        },
        {
          label: "Vote for Smooth",
          href: "/api/vote?candidate=Smooth",
          type: "transaction",
        },
      ],
    },
  };

  return Response.json(metadata, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

/* =========================
   POST → BUILD TRANSACTION
   ========================= */
export async function POST(request: Request) {
  /* ---------- Parse candidate ---------- */
  const url = new URL(request.url);
  const candidate = url.searchParams.get("candidate");

  if (candidate !== "Crunchy" && candidate !== "Smooth") {
    return new Response("Invalid candidate", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  /* ---------- Solana connection ---------- */
  const connection = new Connection(
    "http://127.0.0.1:8899",
    "confirmed"
  );

  /* ---------- Anchor Program ---------- */
  const program = new Program<Voting>(IDL, {
    connection,
  });

  /* ---------- Wallet public key ---------- */
  const body: ActionPostRequest = await request.json();

  let voter: PublicKey;
  try {
    voter = new PublicKey(body.account);
  } catch {
    return new Response("Invalid wallet address", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  /* =========================
     PROGRAM CONSTANTS
     ========================= */
  const pollId = new BN(1);

  /* =========================
     PDA DERIVATION
     ========================= */

  // Poll PDA
  const [pollPda] = PublicKey.findProgramAddressSync(
    [pollId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Candidate PDA
  const [candidatePda] = PublicKey.findProgramAddressSync(
    [
      pollId.toArrayLike(Buffer, "le", 8),
      Buffer.from(candidate),
    ],
    program.programId
  );

  /* =========================
     BUILD INSTRUCTION
     ========================= */
  const instruction = await program.methods
    .vote(candidate, pollId)
    .accountsPartial({
      signer: voter,
      candidate: candidatePda,
    })
    .instruction();

  /* =========================
     BUILD TRANSACTION
     ========================= */
  const blockhash = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: voter,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }).add(instruction);

  /* =========================
     RETURN TO WALLET
     ========================= */
  const response = await createPostResponse({
    fields: {
      type: "transaction",
      transaction,
    },
  });

  return Response.json(response, {
    headers: ACTIONS_CORS_HEADERS,
  });
}
