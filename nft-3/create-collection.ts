import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  airdropIfRequired,
  getExplorerLink,
  getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  base58,
} from "@metaplex-foundation/umi";

import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

async function main() {
  /* ---------------- CONNECTION ---------------- */
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  /* ---------------- WALLET ---------------- */
  const user = await getKeypairFromFile();

  await airdropIfRequired(
    connection,
    user.publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL
  );

  console.log("Loaded user:", user.publicKey.toBase58());

  /* ---------------- UMI ---------------- */
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(mplTokenMetadata());

  const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiUser));

  console.log("Umi instance set up");

  /* ---------------- CREATE COLLECTION ---------------- */
  const collectionMint = generateSigner(umi);

  const builder = await createNft(umi, {
    mint: collectionMint,
    name: "My Collection",
    symbol: "MC",
    uri: "https://raw.githubusercontent.com/Subrat0802/solana-token-metadata/main/nft.json",
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  });

  // 🔹 Send tx (NO confirm here)
  const signatureBytes = await builder.send(umi);

  // 🔹 Convert Uint8Array → base58 string (CORRECT WAY)
  const signature = base58.deserialize(signatureBytes)[0];

  console.log(
    "Transaction:",
    getExplorerLink("tx", signature, "devnet")
  );

  /* ---------------- WAIT FOR MINT TO EXIST ---------------- */
  console.log("Waiting for mint account to be created...");

  for (let i = 0; i < 15; i++) {
    try {
      const nft = await fetchDigitalAsset(
        umi,
        collectionMint.publicKey
      );

      console.log(
        "✅ Collection NFT created:",
        getExplorerLink(
          "address",
          nft.mint.publicKey,
          "devnet"
        )
      );
      return;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("❌ Mint account not found after waiting");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
