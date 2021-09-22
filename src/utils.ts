export type Constructor = new (...args: any[]) => {};
export type GConstructor<T = {}> = new (...args: any[]) => T;
export const HocClass = <T extends Constructor, Y extends Constructor>(
  Base: T,
  ExtendClass: Y,
) => {
  class BaseClass extends Base { }
  if (ExtendClass) {
    Object.getOwnPropertyNames(ExtendClass.prototype).forEach((name) => {
      if (name !== 'constructor') {
        BaseClass.prototype[name] = ExtendClass.prototype[name];
      }
    });
  }
  return BaseClass as unknown as typeof Base;
};

export const applyMixins = (derivedCtor: any, constructors: any[]) => {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
        Object.create(null)
      );
    });
  });
}
export const isUndefined = (obj: any): obj is undefined =>
  typeof obj === 'undefined';
export const isObject = (fn: any): fn is Record<string, unknown> =>
  !isNil(fn) && typeof fn === 'object';
export const isNil = (obj: any): obj is null | undefined =>
  isUndefined(obj) || obj === null;

export const isPlainObject = (fn: any): fn is object => {
  if (!isObject(fn)) {
    return false;
  }
  const proto = Object.getPrototypeOf(fn);
  if (proto === null) {
    return true;
  }
  const ctor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor;
  return (
    typeof ctor === 'function' &&
    ctor instanceof ctor &&
    Function.prototype.toString.call(ctor) ===
    Function.prototype.toString.call(Object)
  );
};
export const isObjectEmpty = (value) => {
  if (value == null) {
    return true;
  }
  return isObject(value) && Object.keys(value).length === 0;
};