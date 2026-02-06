import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function CardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const cards = await db.card.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  async function registerCard(formData: FormData) {
    "use server";

    const authSession = await auth();
    if (!authSession?.user?.id) throw new Error("Unauthorized");

    const uid = (formData.get("uid") as string).toUpperCase().replace(/\s/g, "");
    const aesKey = (formData.get("aesKey") as string).replace(/\s/g, "");
    const label = formData.get("label") as string;

    if (!uid || uid.length !== 14) throw new Error("UID must be 7 bytes (14 hex chars)");
    if (!aesKey || aesKey.length !== 32) throw new Error("AES key must be 16 bytes (32 hex chars)");

    await db.card.create({
      data: {
        uid,
        aesKey,
        label: label || null,
        ownerId: authSession.user.id,
      },
    });

    revalidatePath("/dashboard/cards");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">NFC Cards</h1>
        <p className="text-muted-foreground">Register and manage your NTAG 424 DNA cards.</p>
      </div>

      {/* Register card form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Register New Card</CardTitle>
          <CardDescription>
            Enter the card UID and AES key from your NTAG 424 DNA card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={registerCard} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="uid">Card UID (7 bytes hex)</Label>
                <Input
                  id="uid"
                  name="uid"
                  placeholder="04A1B2C3D4E5F6"
                  maxLength={14}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aesKey">AES Key (16 bytes hex)</Label>
                <Input
                  id="aesKey"
                  name="aesKey"
                  type="password"
                  placeholder="00000000000000000000000000000000"
                  maxLength={32}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input id="label" name="label" placeholder="e.g. Card #1" />
              </div>
            </div>
            <Button type="submit" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Register Card
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card list */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-muted-foreground">
            <CreditCard className="mb-2 h-8 w-8" />
            <p>No cards registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Counter</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>{card.label || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{card.uid}</TableCell>
                    <TableCell>{card.rollingCounter}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(card.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
