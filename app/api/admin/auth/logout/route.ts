import { destroyAdminSession, getAdminSession } from "@/lib/auth/session";
import { jsonOk, requestContext } from "@/lib/api/helpers";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  if (session) {
    await audit({
      actorType: "admin",
      actorId: session.userId,
      actorName: session.name,
      action: "admin.logout",
      ipHash: context.clientIpHash,
    }).catch(() => undefined);
  }
  await destroyAdminSession();
  return jsonOk({ loggedOut: true });
}
