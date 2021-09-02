export type Constructor = new (...args: any[]) => {};
export const HocClass= <T extends Constructor, Y extends Constructor>(
  Base: T,
  ExtendClass: Y,
) => {
  class BaseClass extends Base {}
  if (ExtendClass) {
    Object.getOwnPropertyNames(ExtendClass.prototype).forEach((name) => {
      if (name !== 'constructor') {
        BaseClass.prototype[name] = ExtendClass.prototype[name];
      }
    });
  }
  return BaseClass as unknown as typeof Base;
};