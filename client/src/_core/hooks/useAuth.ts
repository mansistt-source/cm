import { trpc } from "@/lib/trpc";

export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { user: user ?? null, isLoading, isAuthenticated: !!user };
}

export function useRequireAuth() {
  return useAuth();
}
