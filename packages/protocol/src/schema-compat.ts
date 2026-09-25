import { Effect, Schema, SchemaGetter, SchemaIssue } from "effect";

export type CompatibleSchema<S extends Schema.ConstraintDecoder<unknown>> =
    S & {
        parse(value: unknown): S["Type"];
        safeParse(
            value: unknown,
        ):
            | { success: true; data: S["Type"] }
            | { success: false; error: Error };
    };

type MutableFields<F extends Schema.Struct.Fields> = {
    readonly [K in keyof F]: Schema.mutableKey<F[K]>;
};

type StrictStruct<F extends Schema.Struct.Fields> = Schema.Codec<
    Schema.Struct.Type<MutableFields<F>>,
    Schema.Struct.Encoded<MutableFields<F>>
> & { readonly fields: F };

export function mutableStruct<const F extends Schema.Struct.Fields>(fields: F) {
    const mutableFields = Object.fromEntries(
        Object.entries(fields).map(([key, field]) => [
            key,
            Schema.mutableKey(field),
        ]),
    ) as MutableFields<F>;
    return Schema.Struct(mutableFields);
}

export function mutableArray<S extends Schema.ConstraintDecoder<any, any>>(
    item: S,
) {
    return Schema.mutable(Schema.Array(item));
}

/** Keeps the old call sites on the same Effect Schema decoder. */
export function compatible<S extends Schema.ConstraintDecoder<unknown>>(
    schema: S,
): CompatibleSchema<S> {
    const decode = Schema.decodeUnknownSync(schema);
    return Object.assign(schema, {
        parse: decode,
        safeParse(value: unknown) {
            try {
                return { success: true as const, data: decode(value) };
            } catch (error) {
                return {
                    success: false as const,
                    error:
                        error instanceof Error
                            ? error
                            : new Error(String(error)),
                };
            }
        },
    });
}

/** Zod strictObject semantics, available to both the facade and RPC decoder. */
export function strictStruct<const F extends Schema.Struct.Fields>(
    fields: F,
): StrictStruct<F> {
    const struct = mutableStruct(fields);
    const open = Schema.StructWithRest(struct, [
        Schema.Record(Schema.String, Schema.Unknown),
    ]);
    const checked = open.check(
        Schema.makeFilter((value) => {
            const extra = Object.keys(value).find(
                (key) => !Object.hasOwn(fields, key),
            );
            return extra === undefined
                ? undefined
                : { path: [extra], issue: "Unexpected key" };
        }),
    );
    return Object.assign(checked, { fields }) as unknown as StrictStruct<F>;
}

/** For schemas whose accepted wire shape is intentionally dynamic. */
export function fromUnknown<T>(decode: (value: unknown) => T) {
    const target = Schema.declare<T>((_value): _value is T => true);
    return Schema.Unknown.pipe(
        Schema.decodeTo(target, {
            decode: SchemaGetter.transformEffect((value) =>
                Effect.try({
                    try: () => decode(value),
                    catch: (error) =>
                        new SchemaIssue.InvalidValue(
                            {
                                message:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                            value,
                        ),
                }),
            ),
            encode: SchemaGetter.transform((value) => value) as never,
        }),
    ) as unknown as Schema.Codec<T, unknown>;
}
