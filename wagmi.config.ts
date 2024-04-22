import { defineConfig } from "@wagmi/cli";
import { blockscout, react } from "@wagmi/cli/plugins";
import dotenv from "dotenv";
import { optimismSepolia, sepolia } from "wagmi/chains";

dotenv.config();

export default defineConfig([
  {
    out: "src/lib/revnet/hooks/contract.ts",
    plugins: [
      blockscout({
        apiKey: process.env.BLOCKSCOUT_API_KEY!,
        chainId: sepolia.id,
        contracts: [
          {
            name: "REVBasicDeployer",
            address: {
              // https://github.com/rev-net/revnet-core/blob/main/deployments/revnet-core/sepolia/REVBasicDeployer.json
              [sepolia.id]: "0x586431a0CF041d868034E7446Cb6cbDe43566088",
              // https://github.com/rev-net/revnet-core/blob/main/deployments/revnet-core/optimism_sepolia/REVBasicDeployer.json
              [optimismSepolia.id]:
                "0x586431a0CF041d868034E7446Cb6cbDe43566088",
            },
          },
        ],
      }),
      react(),
    ],
  },
]);
