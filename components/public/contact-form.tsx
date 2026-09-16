"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { contactSchema } from "@/lib/validation/schemas";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type FormValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "", website: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to send message");
      toast({ kind: "success", title: "Message sent", message: "Thanks for reaching out — we'll reply soon." });
      reset();
    } catch (err) {
      toast({ kind: "error", title: "Could not send message", message: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="contact-name">Name *</Label>
        <Input id="contact-name" autoComplete="name" placeholder="Jane Doe" error={errors.name?.message} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="contact-email">Email *</Label>
        <Input id="contact-email" type="email" autoComplete="email" placeholder="jane@example.com" error={errors.email?.message} {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="contact-phone">Phone</Label>
        <Input id="contact-phone" type="tel" autoComplete="tel" placeholder="+1 555 000 1234" error={errors.phone?.message} {...register("phone")} />
        <FieldError message={errors.phone?.message} />
      </div>
      <div>
        <Label htmlFor="contact-subject">Subject *</Label>
        <Input id="contact-subject" placeholder="Speaking, tickets, press…" error={errors.subject?.message} {...register("subject")} />
        <FieldError message={errors.subject?.message} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="contact-message">Message *</Label>
        <Textarea id="contact-message" rows={6} placeholder="How can we help?" error={errors.message?.message} {...register("message")} />
        <FieldError message={errors.message?.message} />
      </div>
      {/* Honeypot — hidden from humans, bots fill it */}
      <div aria-hidden="true" className="hidden">
        <label>Website<input type="text" tabIndex={-1} autoComplete="off" {...register("website")} /></label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={isSubmitting} size="lg" className="w-full sm:w-auto">
          Send message
        </Button>
      </div>
    </form>
  );
}
