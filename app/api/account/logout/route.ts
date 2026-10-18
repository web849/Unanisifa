import { guardMutation, jsonOk } from "@/lib/api/helpers";
import { destroyCustomerSession } from "@/lib/auth/customer-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  await destroyCustomerSession();
  return jsonOk({ loggedOut: true });
}
