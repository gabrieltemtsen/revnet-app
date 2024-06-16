import { type TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import request from "graphql-request";

export function useSubgraphQuery<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): UseQueryResult<TResult> {
  return useQuery({
    queryKey: [(document.definitions[0] as any).name.value, variables],
    queryFn: async ({ queryKey }) => {
      if (!process.env.NEXT_PUBLIC_SUBGRAPH_URL) {
        throw new Error("NEXT_PUBLIC_SUBGRAPH_URL is not set");
      }

      return request(
        process.env.NEXT_PUBLIC_SUBGRAPH_URL,
        document,
        queryKey[1] ? queryKey[1] : undefined
      );
    },
  });
}
