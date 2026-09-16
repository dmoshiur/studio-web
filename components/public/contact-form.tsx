"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { contactSchema } from "@/lib/validation/schemas";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type FormValues = z.infer<typeof contactSchema>;

/** Contact form on the ivory studio surface — light tone fields, gold action. */
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
      toast({
        kind: "success",
        title: "Message received",
        message: "Thank you — we will reply within two business days.",
      });
      reset();
    } catch (err) {
      toast({
        kind: "error",
        title: "Could not send message",
        message: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="contact-name" tone="light">
          Name *
        </Label>
        <Input
          id="contact-name"
          tone="light"
          autoComplete="name"
          placeholder="Jane Doe"
          error={errors.name?.message}
          {...register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="contact-email" tone="light">
          Email *
        </Label>
        <Input
          id="contact-email"
          tone="light"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="contact-phone" tone="light">
          Phone
        </Label>
        <Input
          id="contact-phone"
          tone="light"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 000 1234"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <FieldError message={errors.phone?.message} />
      </div>
      <div>
        <Label htmlFor="contact-subject" tone="light">
          Subject *
        </Label>
        <Input
          id="contact-subject"
          tone="light"
          placeholder="Speaking, tickets, press…"
          error={errors.subject?.message}
          {...register("subject")}
        />
        <FieldError message={errors.subject?.message} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="contact-message" tone="light">
          Message *
        </Label>
        <Textarea
          id="contact-message"
          tone="light"
          rows={6}
          placeholder="How can we help?"
          error={errors.message?.message}
          {...register("message")}
        />
        <FieldError message={errors.message?.message} />
      </div>

      {/* Honeypot — hidden from humans, bots fill it */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex h-[52px] items-center gap-3 bg-obsidian-900 px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-ivory-100 transition-colors hover:bg-obsidian-800 disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : "Send message"}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}
