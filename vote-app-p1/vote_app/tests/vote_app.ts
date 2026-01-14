import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { expect } from "chai";
import { getAccount, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const SEEDS = {
  TREASURY_CONFIG: "treasury_config",
  SOL_VAULT: "sol_vault",
  X_MINT: "x_mint",
  MINT_AUTHORITY: "mint_authority",
  VOTER: "voter",
  PROPOSAL_COUNTER: "proposal_counter",
  PROPOSAL: "proposal",
  WINNER: "winner"
} as const;

const PROPOSAL_ID = 1;

const findPda = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]):anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

const airDropSol = async (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, sol: number) => {
  const signature = await connection.requestAirdrop(publicKey, sol);
  await connection.confirmTransaction(signature, "confirmed");
}

const getBlockTime = async (connection: anchor.web3.Connection):Promise<Number> => {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot);

  if(blockTime === null) {
    throw new Error("Failed to fetch the block time")
  }
  return blockTime;
}


const expectedAnchorErrorCode = (err: unknown, expectedCode: string) => {
  const anyErr = err as any;
  const actualCode = 
    anyErr?.error?.errorCode?.code ??
    anyErr?.errorCode?.code ??
    anyErr?.code;

  expect(actualCode).to.equal(expectedCode)
}

 
describe("vote_app", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);
  const program = anchor.workspace.voteApp as Program<VoteApp>;



  const adminWallet = (provider.wallet as NodeWallet).payer;
  let treasuryTokenAccount:anchor.web3.PublicKey;



  let proposalCreatorWallet = new anchor.web3.Keypair();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;

  let proposalCounterPda: anchor.web3.PublicKey;
  let proposalPda: anchor.web3.PublicKey;



  let voterWallet = new anchor.web3.Keypair();
  let voterTokenAccount: anchor.web3.PublicKey;
  let voterPda: anchor.web3.PublicKey;


  let winnerPda: anchor.web3.PublicKey;



  let treasuryConfigPda: anchor.web3.PublicKey;
  let xMintPda: anchor.web3.PublicKey;
  let solVaultPda: anchor.web3.PublicKey;
  let mintAuthorityPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)])
    solVaultPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)])
    xMintPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)])
    mintAuthorityPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)])
    voterPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.VOTER), voterWallet.publicKey.toBuffer()])
    proposalPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL), Buffer.from([PROPOSAL_ID])])
    proposalCounterPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL_COUNTER)]);
    winnerPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.WINNER)])
    await airDropSol(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await airDropSol(connection, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
  })


  const createTokenAccount = async () => {
    treasuryTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      xMintPda,
      adminWallet.publicKey
    )).address

    proposalCreatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      proposalCreatorWallet,
      xMintPda,
      proposalCreatorWallet.publicKey
    )).address

    voterTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      voterWallet,
      xMintPda,
      voterWallet.publicKey
    )).address
  }

  describe("1.Initialize treasury account", () => {
    it("1.1 - initialize treasury",async () => {
      const solPrice = new anchor.BN(1000000000)
      const tokenPerPurchase = new anchor.BN(1000000000)
      console.log("Treasury config pda", treasuryConfigPda.toBase58());

      const tx = await program.methods.initializTreasury(solPrice, tokenPerPurchase).accountsPartial({
        authority: adminWallet.publicKey,
      }).rpc();
      console.log(tx);
      const treasuryAccountData = await program.account.treasuryConfig.fetch(treasuryConfigPda); 
      console.log("reasuryAccountData", treasuryAccountData)
      expect(treasuryAccountData.authority.toBase58()).to.equal(adminWallet.publicKey.toBase58());
      expect(treasuryAccountData.tokenPerPurchase.toNumber()).to.equal(tokenPerPurchase.toNumber());
      expect(treasuryAccountData.solPrice.toNumber()).to.equal(solPrice.toNumber());
      expect(treasuryAccountData.xMint.toBase58()).to.equal(xMintPda.toBase58());
      await createTokenAccount();
    })
  })

  describe("2. buy tokens for proposal and voter wallet", () => {
    it("2.1 - buy token for proposal", async () => {
      const tokenBalanceBefore = (await getAccount(connection, proposalCreatorTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer: proposalCreatorWallet.publicKey,
        xMint: xMintPda,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: proposalCreatorTokenAccount
      }).signers([proposalCreatorWallet]).rpc();

      const tokenBalanceAfter = (await getAccount(connection, proposalCreatorTokenAccount)).amount;
      console.log(tokenBalanceAfter)
      console.log(tokenBalanceBefore);
      expect(tokenBalanceAfter - tokenBalanceBefore).to.equal(BigInt(1000000000));
    })

    it("2.2 - buy token for voter wallet", async () => {
      const tokenBalanceBefore = (await getAccount(connection, voterTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer: voterWallet.publicKey,
        xMint: xMintPda,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: voterTokenAccount
      }).signers([voterWallet]).rpc();

      const tokenBalanceAfter = (await getAccount(connection, voterTokenAccount)).amount;
      console.log(tokenBalanceAfter)
      console.log(tokenBalanceBefore);
      expect(tokenBalanceAfter - tokenBalanceBefore).to.equal(BigInt(1000000000));
    })
  })

  describe("3. register voters", () => {
    it("3.1 - Register voter", async () => {
      await program.methods.registerVoter().accountsPartial({
        authority: voterWallet.publicKey,           
      }).signers([voterWallet]).rpc();

      const voterAccountData = await program.account.voter.fetch(voterPda);
        expect(voterAccountData.voterId.toBase58()).to.equal(voterWallet.publicKey.toBase58());
        console.log("voterAccount", voterAccountData.voterId.toBase58());
        console.log("voterAccount", voterWallet.publicKey.toBase58());
        console.log("voter pda", voterPda.toBase58());
        console.log("voterAccount", voterAccountData.proposalVoted);
    })
  })


  describe("4. register proposal", () => {
    it("4.1 - Register voter", async () => {
      const currentBlockTime = await getBlockTime(connection);
      const deadLine = new anchor.BN(Number(currentBlockTime) + 10);
      const proposalInfo = "Build a layer 2 Solution";
      const stakeAmount = new anchor.BN(1000);

      await program.methods.registerProposal(proposalInfo, deadLine, stakeAmount).accountsPartial({
        authority: proposalCreatorWallet.publicKey,    
        proposalTokenAccount: proposalCreatorTokenAccount,
        proposalCounterAccount: proposalCounterPda,
        treasuryTokenAccount: treasuryTokenAccount,
        xMint: xMintPda
      }).signers([proposalCreatorWallet]).rpc();

      const proposalAccountData = await program.account.proposal.fetch(proposalPda);
      console.log(proposalAccountData);
      const proposalCounterAccountData = await program.account.proposalCounter.fetch(proposalCounterPda);
      expect(proposalCounterAccountData.proposalCount).to.equal(2);

      expect(proposalAccountData.authority.toBase58()).to.equal(proposalCreatorWallet.publicKey.toBase58());
    })
  })

  
  

  describe("5. Vote to proposal", () => {
    it("5.1 - cast vote!", async () => {
      const stakeAmountToVote = new anchor.BN(100);
      const voterBalanceBefore = (await getAccount(connection, voterTokenAccount)).amount;
      
      await program.methods.proposalToVote(PROPOSAL_ID, stakeAmountToVote).accountsPartial({
        authority: voterWallet.publicKey,
        voterTokenAccount: voterTokenAccount,
        treasuryTokenAccount: treasuryTokenAccount,
        xMint: xMintPda
      }).signers([voterWallet]).rpc();
      const voterBalanceAfter = (await getAccount(connection, voterTokenAccount)).amount;
      console.log("voterAfterBefore", voterBalanceBefore)
      console.log("voterAfterBefore", voterBalanceAfter)
    })
  })

  describe("6. Pick Winner", () => {
    it("6.1 - 6.1 should FAIL to pick winner before deadline passes!", async () => {
      try{
        await program.methods.pickWinner(PROPOSAL_ID).accounts({
          authority: adminWallet.publicKey
        }).rpc();
      }catch(error){
        expectedAnchorErrorCode(error, "VotingStillActive")
      }
    })

    it("6.2 - should pick winner after deadline passes!", async () => {
      console.log("------------waiting for voting deadline-----------------");
      await new Promise((reslove) => setTimeout(reslove, 12000));
      await program.methods.pickWinner(PROPOSAL_ID).accounts({
        authority: adminWallet.publicKey
      }).rpc();
      const winnerPdaData = await program.account.winner.fetch(winnerPda);
      console.log("WINER< PDA DATA:", winnerPdaData);
      expect(winnerPdaData.winnerProposalId).to.equal(PROPOSAL_ID);
      expect(winnerPdaData.winnerVotes).to.equal(1);

    })
  })


  describe("7. Close proposal account!", async () => {
    it("7.1 - closing propsal account after propsal is not live", async () => {
      await program.methods.closeProposalAccount(PROPOSAL_ID).accounts({
        authority: proposalCreatorWallet.publicKey,
        destination: proposalCreatorWallet.publicKey
      }).signers([proposalCreatorWallet]).rpc()
    })
  })


  describe("8. Close voter account", () => {
      it("8.1 should close voter and revocer rent!", async () => {
        const accountInfoBefore = await connection.getAccountInfo(voterPda);
        expect(accountInfoBefore).to.not.be.null;

        const voterBalancebefore = await connection.getBalance(voterWallet.publicKey);
        console.log("Voter balance before", voterBalancebefore)

          await program.methods.closeVoterAccount().accounts({
            authority: voterWallet.publicKey
          }).signers([voterWallet]).rpc();

          const accountInfoAfter = await connection.getAccountInfo(voterPda);
          expect(accountInfoAfter).to.be.null


        const voterBalanceAfter = await connection.getBalance(voterWallet.publicKey);
        console.log("Voter balance after", voterBalanceAfter)
        if(voterBalancebefore<voterBalanceAfter){
          console.log("Amount trnsfered successfully")
        }
      })
    })


});
