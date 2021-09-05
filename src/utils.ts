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