import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from '@solana/actions'
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { VoteApp } from "../../../../../vote_app/target/types/vote_app"
import { BN, Program } from "@coral-xyz/anchor";
import IDL from "@/idl/vote_app.json"

export const OPTIONS = GET

export async function GET(request: Request) {
  const actionMetaData: ActionGetResponse = {
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEwJxs55mRBCNvPUpMIKrjYqRWJyB0ZUjj8Q&s',
    title: 'Vote for your favourite type of Peanut butter',
    description: 'Vote between crunchy and smooth peanut butter',
    label: 'Vote',
    links: {
      actions: [
                {
                  label: "Vote for Crunchy",
                  href: "/api/vote?candidate=Crunchy",
                },
                {
                  label: "Vote for Smooth",
                  href: "/api/vote?candidate=Smooth",
                }
      ],
    },
  }
  return Response.json(actionMetaData, { headers: ACTIONS_CORS_HEADERS })
}


export async function POST(request: Request) {
        
        const url = new URL(request.url);
        const candidate = url.searchParams.get("candidate");

        if(candidate != "Crunchy" && candidate != "Smooth") {
                return new Response("Invalide candidate", {status: 400, headers: ACTIONS_CORS_HEADERS});
        }
        const connection = new Connection("http://127.0.0.1:8899", "confirmed");
        const program: Program<VoteApp> = new Program(IDL, {connection});

        const body: ActionPostRequest = await request.json();
        let voter;

        try{
            voter = new PublicKey(body.account);
        }catch(error){
            return new Response("Invalid account", {status: 400, headers: ACTIONS_CORS_HEADERS});
        }

        const instruction = await program.methods
          .vote(candidate, new BN(1))
          .accounts({
            signer: voter
          })
          .instruction()

        
          const blockHash = await connection.getLatestBlockhash();
          const tx = new Transaction({
            feePayer: voter,
            blockhash: blockHash.blockhash,
            lastValidBlockHeight: blockHash.lastValidBlockHeight
          }).add(instruction);

          const response = await createPostResponse({
            fields:{
              transaction: tx,
            }
          });

          return Response.json(response, {headers: ACTIONS_CORS_HEADERS});

}