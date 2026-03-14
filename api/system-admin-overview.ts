export default async function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    message: "system-admin-overview static test"
  });
}
