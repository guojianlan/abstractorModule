/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { BadRequestException, Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AbstractTypeOrmService, FindAllQuery, IpaginationResult } from './typeorm.service';
import { PartialType } from '@nestjs/mapped-types';
import { validate } from 'class-validator'
import { plainToClass } from 'class-transformer';
import { InsertResult } from 'typeorm';

export interface IDecorators {
  findAll?: Array<MethodDecorator | PropertyDecorator>;
  findOne?: Array<MethodDecorator | PropertyDecorator>;
  create?: Array<MethodDecorator | PropertyDecorator>;
  update?: Array<MethodDecorator | PropertyDecorator>;
  delete?: Array<MethodDecorator | PropertyDecorator>;
}
export interface IAbstractController<T> {
  _service: AbstractTypeOrmService<T>;
  findAll: (
      query: FindAllQuery,
  ) => Promise<{ list: T[] } | IpaginationResult<T> >;
  findOne: (id: number) => Promise< boolean | T >;
  create: (body: any) => Promise< T[] | InsertResult >;
  update: (id: number, body: any) => Promise< T >;
  delete: (id: number) => Promise<boolean>;
}
export interface IAfterFn {
  findAll?: <T>(this: IAbstractController<T>, result: any) => Promise<T>;
  findOne?: <T>(this: IAbstractController<T>, result: any) => Promise<T>;
  create?: <T>(this: IAbstractController<T>, result: any) => Promise<T>;
  update?: <T>(this: IAbstractController<T>, result: any) => Promise<T>;
  delete?: <T>(this: IAbstractController<T>, result: any) => Promise<T>;
}
export type AbstractControllerOptions<T> = {
  model: any;
  decorators?: IDecorators;
  afterFunctions?: IAfterFn
};
export function WrapDecorators(decorators: IDecorators) {
  return <TFunction extends Function, Y>(
    target: TFunction | object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>,
  ) => {
    if (decorators) {
      const wrapDecorators = decorators[propertyKey as string];
      if (wrapDecorators) {
        for (const decorator of wrapDecorators) {
          if (decorator) {
            if (target instanceof Function && !descriptor) {
              (decorator as ClassDecorator)(target);
              continue;
            }
            (decorator as MethodDecorator | PropertyDecorator)(
              target,
              propertyKey,
              descriptor,
            );
          }
        }
      }
    }
  };
}
export type ClassType<T> = {
  new(...args: any[]): T;
};


export function WrapController<T>(options: AbstractControllerOptions<T>) {
  const model = options.model;

  // class createDto extends model { }
  // class updateDto extends PartialType(createDto) { }
  // let createDto =Par<HocClass(function(){} as any,model) as unknown as Type<any>>
  // class updateDto extends PartialType(createDto) { }
  abstract class AbstractController implements IAbstractController<T>{
    public readonly _service: AbstractTypeOrmService<T>;
    protected constructor(service: any) {
      this._service = service;
    }
    @Get()
    @WrapDecorators(options.decorators)
    public async findAll(@Query() query: FindAllQuery)  {
      let result = await this._service.find(query)
      if (options?.afterFunctions?.findAll) {
        result = await options?.afterFunctions?.findAll.apply(this,[result])
      }
      // 判断是否有page
      return result
    }
    @WrapDecorators(options.decorators)
    @Get(':id')
    public async findOne(@Param('id') id: number) {
      let result = await this._service.findOne(id);
      if (options?.afterFunctions?.findOne) {
        result = await options?.afterFunctions?.findOne.apply(this, [result]);
      }
      return result
    }
    @WrapDecorators(options.decorators)
    @Post()
    public async create(@Body() body: any) {
      try {
        const object = plainToClass(model, body);
        let error = await validate(object);
        if (error.length > 0) {
          throw new BadRequestException(error.map(item => {
            return {
              property: item.property,
              constraints: Object.values(item.constraints || {})
            }
          }))
        }
        let result = await this._service.create<any>(body);
        if (options?.afterFunctions?.create) {
          result = await options?.afterFunctions?.create.apply(this, [result]);
        }
        return result
      } catch (error) {
        throw error
      }

    }
    @WrapDecorators(options.decorators)
    @Put(':id')
    public async update(@Param() id: number, @Body() body: any) {
      const partial = PartialType(model);
      let object = plainToClass(partial, body)
      let error = await validate(object);
      if (error.length > 0) {
        throw new BadRequestException(error.map(item => {
          return {
            property: item.property,
            constraints: Object.values(item.constraints || {})
          }
        }))
      }
      let result = await this._service.update(id, body);
      if (options?.afterFunctions?.update) {
        result = await options?.afterFunctions?.update.apply(this, [result]);
      }
      return result
    }
    @WrapDecorators(options.decorators)
    @Delete(':id')
    public async delete(@Param('id') id: number): Promise<boolean> | never {
      let result = await this._service.delete(id);
      if (options?.afterFunctions?.delete) {
        return options?.afterFunctions?.delete.apply(this, [result]);
      } else {
        return result
      }
    }
  }
  return AbstractController as unknown as (new (...args) => { [key in keyof AbstractController]: AbstractController[key] });
}
