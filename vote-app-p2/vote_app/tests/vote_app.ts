import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { expect } from "chai";


const SEEDS = {
  POLL:"poll",
  NAMEC:"Crunchy",
  NAMES:"Smooth"
} as const;

const findPda = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]):anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

const POLLID = 1;

describe("vote_app", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);
  const program = anchor.workspace.voteApp as Program<VoteApp>;
  const adminWallet = (provider.wallet as NodeWallet).payer;

  

  let pollPda: anchor.web3.PublicKey;
  let candidatePdaC: anchor.web3.PublicKey;
  let candidatePdaS: anchor.web3.PublicKey;

  beforeEach( async () => {
    pollPda = findPda(program.programId, [Buffer.from([POLLID])]) //new anchor.BN(1).toArrayLike(Buffer, 'le', 8)]
    candidatePdaC = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.NAMEC), Buffer.from([POLLID])])
    candidatePdaS = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.NAMES), Buffer.from([POLLID])])
  })


  it("Is initialize poll!", async () => {
    const pollId = POLLID;
    const description = "Which one is the best?";

    await program.methods.initializePoll(pollId, description).accountsPartial(
      {
        signer:adminWallet.publicKey,
      }
    ).rpc();

    const pollAccountData = await program.account.poll.fetch(pollPda);
    console.log(pollAccountData.pollStart.toNumber());
    console.log(pollAccountData.pollEnd.toNumber());
    console.log(pollAccountData.pollDescription);
    console.log(pollAccountData.pollId);
    console.log(pollAccountData.candidateAmount.toNumber());

    expect(pollAccountData.pollId).to.equal(POLLID);
    expect(pollAccountData.pollDescription).to.equal(description);
    expect(pollAccountData.candidateAmount.toNumber()).to.equal(0);
  });

  it("is adding candidates", async () => {
    const candidateNameC = SEEDS.NAMEC;
    const candidateNameS = SEEDS.NAMES;
    const pollId = POLLID;
    await program.methods.initializeCandidate(candidateNameC, pollId).accountsPartial({
      signer: adminWallet.publicKey
    }).signers([adminWallet]).rpc()

    await program.methods.initializeCandidate(candidateNameS, pollId).accountsPartial({
      signer: adminWallet.publicKey
    }).signers([adminWallet]).rpc()

    const candidateAccountCData = await program.account.candidate.fetch(candidatePdaC);
    console.log(candidateAccountCData);

    const candidateAccountSData = await program.account.candidate.fetch(candidatePdaS);
    console.log(candidateAccountSData);

    const pollAccountData = await program.account.poll.fetch(pollPda);
    console.log(pollAccountData.candidateAmount.toNumber());
    expect(pollAccountData.candidateAmount.toNumber()).to.equal(2);
  })


  it("is vote", async () => {
    const candidateNameC = SEEDS.NAMEC;
    const pollId = POLLID;
    const candidateVoteDetailsBefore = await program.account.candidate.fetch(candidatePdaC);
    console.log(candidateVoteDetailsBefore.candidateVotes.toNumber());

    await program.methods.vote(candidateNameC, pollId).accounts({
      signer: adminWallet.publicKey,
    }).rpc();

    const candidateVoteDetailsAfter = await program.account.candidate.fetch(candidatePdaC);
    console.log(candidateVoteDetailsAfter.candidateVotes.toNumber());

  })
});
