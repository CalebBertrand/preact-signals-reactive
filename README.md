# preact-signals-reactive

## Important: this isn't considered stable, I am using it in my personal projects and still working through an api I like.

### Motivation
Coming from Vue, I missed the convenience of putting a full state object into a `reactive` and using it as a sort of store. In Preact, this has been a bit more challenging since putting a full object of state into a signal will cause all relevant subscribers to re-render, even if only a small part of it is updated. This is basically a re-implementation of vue's reactive except, under the hood all state keys in the object are held in preact signals. 

### Use
Outside a component, you can create a reactive with `reactive`. Its also available as a hook, `useReactive`. An object parameter is expected, which will define the shape of your state and its initial values. This works recursively with nested objects, but currently does not support changing shape over time (and I don't forsee needing that in the future for my use cases). 
```
const state = useReactive({
  age: 35,
  name: 'John'
});
```

Like the vue api, you can get the raw value of the state using a helper function, `getRaw`:
```
state.age = 36;

const user = getRaw(state);
// {
//   age: 36,
//   name: 'John'
// }
```

If you need to get the underlying signal for a given key, you can use `toSignal`:
```
const age$ = toSignal(state, 'age');
```

Reactives also support methods just like in vue, which can allow you to define some zustand style actions:
```
const state = useReactive({
  age: 35,
  name: 'John',
  greet() {
    return `Hi, my name is ${this.name} and I am ${this.age} years old!`;
  }
});

console.log(state.greet());
```
Note that the methods will be excluded from enumeration, so you can call `Object.entries()` on your reactive and be confident you're only iterating over state.

### Current differences from Vue's `reactive`

Currently, arrays are not deeply reactive, and only a few types of values are considered valid state. Namely numbers, strings, arrays, booleans, Dates and undefined / null.
