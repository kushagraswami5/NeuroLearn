"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCardAction } from "@/app/actions/cards";

const schema = z.object({
  front: z.string().min(1, "Question is required").max(1000),
  back: z.string().min(1, "Answer is required").max(2000),
  hint: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateCardButton({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const result = await createCardAction({ topicId, ...data, tags: [] });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Card created!");
    reset();
    router.refresh();
    // Keep dialog open for rapid card creation
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs h-7">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a flashcard</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-front">Question (Front) *</Label>
            <Textarea
              id="card-front"
              placeholder="What is the mitochondria?"
              rows={3}
              {...register("front")}
              className={errors.front ? "border-destructive" : ""}
            />
            {errors.front && (
              <p className="text-xs text-destructive">{errors.front.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-back">Answer (Back) *</Label>
            <Textarea
              id="card-back"
              placeholder="The powerhouse of the cell..."
              rows={4}
              {...register("back")}
              className={errors.back ? "border-destructive" : ""}
            />
            {errors.back && (
              <p className="text-xs text-destructive">{errors.back.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-hint">Hint (optional)</Label>
            <Input
              id="card-hint"
              placeholder="A small hint to help recall..."
              {...register("hint")}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setOpen(false); reset(); }}
            >
              Done
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save & Add Another
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
