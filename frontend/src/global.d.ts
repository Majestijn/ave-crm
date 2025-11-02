// global.d.ts
declare module "@hookform/resolvers/zod" {
  import { ZodSchema } from "zod";
  import { FieldValues, Resolver } from "react-hook-form";

  export const zodResolver: <TFieldValues extends FieldValues = FieldValues>(
    schema: ZodSchema<TFieldValues>,
    options?: {
      async?: boolean;
      mode?: "async" | "sync";
    }
  ) => Resolver<TFieldValues>;
}
