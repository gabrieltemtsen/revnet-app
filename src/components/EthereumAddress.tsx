import { useEnsName } from "@/hooks/ens/useEnsName";
import { formatEthAddress } from "@/lib/utils";
import Image from "next/image";
import EtherscanLink from "./EtherscanLink";

const STAMP_FYI_BASE_URL = "https://cdn.stamp.fyi";

export function ensAvatarUrlForAddress(
  address: string,
  { size }: { size?: number } = {}
) {
  let url = `${STAMP_FYI_BASE_URL}/avatar/${address}`;
  if (size) {
    url += `?s=${size}`;
  }
  return url;
}

export function EthereumAddress({
  address,
  short,
  withEnsName,
  withEnsAvatar,
}: {
  address: string;
  short?: boolean;
  withEnsName?: boolean;
  withEnsAvatar?: boolean;
}) {
  const { data: ensName } = useEnsName(address, { enabled: withEnsName });
  const formattedAddress = short ? formatEthAddress(address) : address;

  const renderValue = ensName ?? formattedAddress;

  return (
    <EtherscanLink className="inline-flex gap-1 items-center" value={address}>
      {withEnsAvatar && (
        <Image
          src={ensAvatarUrlForAddress(address)}
          alt={ensName ?? address}
          className="inline-block w-9 h-9 mr-1 rounded-full"
          width={36}
          height={36}
        />
      )}
      {renderValue}
    </EtherscanLink>
  );
}
