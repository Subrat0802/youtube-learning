import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { expect } from "chai";


const SEEDS = {
  POLL:"poll"
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

  beforeEach( async () => {
    pollPda = findPda(program.programId, [Buffer.from([POLLID])]) //new anchor.BN(1).toArrayLike(Buffer, 'le', 8)]
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
    const candidateName = "Crunchy";
    const pollId = POLLID;
    await program.methods.initializeCandidate(candidateName, pollId).accountsPartial({
      signer: adminWallet.publicKey
    }).signers([adminWallet]).rpc()
  })
});
