import {
  findMetadataPda,
  mplTokenMetadata,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  airdropIfRequired,
  getExplorerLink,
  getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  keypairIdentity,
  publicKey,
} from "@metaplex-foundation/umi";

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

  console.log("Loaded user", user.publicKey.toBase58());

  /* ---------------- UMI ---------------- */
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(mplTokenMetadata());

  const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiUser));

  console.log("Set up Umi instance for user");

  /* ---------------- ADDRESSES ---------------- */
  const collectionAddress = publicKey(
    "9KiWsbxFmNoGHxyk3Uo3TK31JVCMtTNhaqiQDt7gypDX"
  );

  const nftAddress = publicKey(
    "Aqdeq1rJc12mfX6LXRGYjSbJ84wrHunYni1bi1ZMXG54"
  );

  /* ---------------- VERIFY COLLECTION ---------------- */
  console.log("Verifying NFT into collection...");

  const builder = await verifyCollectionV1(umi, {
    metadata: findMetadataPda(umi, { mint: nftAddress }),
    collectionMint: collectionAddress,
    authority: umi.identity,
  });

  const result = await builder.sendAndConfirm(umi);

  console.log(
    "Transaction:",
    getExplorerLink("tx", result.signature, "devnet")
  );

  /* ---------------- WAIT FOR METADATA UPDATE ---------------- */
  await new Promise((r) => setTimeout(r, 3000));

  console.log(
    `✅ NFT verified as part of collection!\n${getExplorerLink(
      "address",
      nftAddress,
      "devnet"
    )}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
