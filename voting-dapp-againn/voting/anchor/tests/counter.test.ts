import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Voting } from "../target/types/voting";

const IDL = require("../target/idl/voting.json");

const votingAddress = new PublicKey(
  "Count3AcZucFDPSFBAeHkQ6AvttieKUkyJ8HiQGhQwe"
);

describe("bankrun", () => {
  let context;
  let provider;
  let votingProgram: anchor.Program<Voting>;

  beforeAll(async () => {
    context = await startAnchor(
      "",
      [{ name: "voting", programId: votingAddress }],
      []
    );

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    votingProgram = new Program<Voting>(
      IDL,
      provider
    );
  })

  it("initialize poll", async () => {
    
    await votingProgram.methods
      .initalizePoll(
        new anchor.BN(1),
        "What is your favorite type of peanut butter?",
        new anchor.BN(0),
        new anchor.BN(1859508293)
      )
      .rpc();

      const [pollAddress] = PublicKey.findProgramAddressSync(
        [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
        votingAddress
      );
      const poll = await votingProgram.account.poll.fetch(pollAddress);
      console.log(poll);
      expect(poll.pollId.toNumber()).toEqual(1);
      expect(poll.description).toEqual("What is your favorite type of peanut butter?");
      expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
  });

  it("init candidate", async () => {
    await votingProgram.methods.initCandidate(
      "Smooth",
      new anchor.BN(1)
    ).rpc();
    await votingProgram.methods.initCandidate(
      "Crunchy",
      new anchor.BN(1)
    ).rpc();

    const [crunchyAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Crunchy")],
      votingAddress
    );

    const crunchyCan = await votingProgram.account.candidate.fetch(crunchyAddress);
    console.log(crunchyCan);
    expect(crunchyCan.candidateVotes.toNumber()).toEqual(0);

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Smooth")],
      votingAddress
    );

    const smoothCan = await votingProgram.account.candidate.fetch(smoothAddress);
    console.log(smoothCan);
    expect(smoothCan.candidateVotes.toNumber()).toEqual(0);
   
  });

  it("vote test", async () => {
    await votingProgram.methods.vote(
      "Smooth",
      new anchor.BN(1)
    ).rpc();

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Smooth")],
      votingAddress
    );
    
    const smoothCan = await votingProgram.account.candidate.fetch(smoothAddress);
    console.log(smoothCan);
    expect(smoothCan.candidateVotes.toNumber()).toEqual(1);
  })
});
