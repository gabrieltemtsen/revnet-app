import { defineConfig } from "@wagmi/cli";
import { etherscan, react } from "@wagmi/cli/plugins";
import dotenv from "dotenv";
import { optimismSepolia, sepolia } from "wagmi/chains";

dotenv.config();

export default defineConfig([
  {
    out: "src/lib/revnet/hooks/contract.ts",
    plugins: [
      etherscan({
        apiKey: process.env.ETHERSCAN_API_KEY!,
        chainId: sepolia.id,
        contracts: [
          {
            name: "REVBasicDeployer",
            address: {
              [sepolia.id]: "0x1e6494fd54c9bdF0eFd796327582512a9C894dc6",
              [optimismSepolia.id]:
                "0xAB03289b007a5De4fdAa7465521D918e49A4e60d",
            },
          },
        ],
      }),
      react(),
    ],
  },
]);
