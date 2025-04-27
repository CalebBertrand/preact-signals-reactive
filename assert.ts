export function assert(condition: unknown, message: string): asserts condition {
    console.assert(!!condition, message);
}

