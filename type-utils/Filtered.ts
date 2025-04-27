export type Filtered<A extends Array<any>, F> =
    A extends Array<infer T> ? Array<Exclude<T, F>> : never;

