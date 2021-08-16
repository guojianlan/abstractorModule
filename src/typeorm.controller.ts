/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AbstractTypeOrmService, FindAllQuery, IpaginationResult } from './typeorm.service';
import { PartialType } from '@nestjs/mapped-types';
import { generate, Observable, map, from, } from 'rxjs'
export interface IDecorators {
  findAll?: Array<MethodDecorator | PropertyDecorator>;
  findOne?: Array<MethodDecorator | PropertyDecorator>;
  create?: Array<MethodDecorator | PropertyDecorator>;
  update?: Array<MethodDecorator | PropertyDecorator>;
  delete?: Array<MethodDecorator | PropertyDecorator>;
}
export interface IAfterFn {
  findAll?: <T>(result: any) => T
  findOne?: <T>(result: any) => T
  create?: <T>(result: any) => T
  update?: <T>(result: any) => T
  delete?: <T>(result: any) => T
}
function identity<T>(arg: T): T {
  return arg;
}
identity<string>('')
export type AbstractControllerOptions<T> = {
  model: any;
  decorators?: IDecorators;
  afterFunctions?: IAfterFn
};
function WrapDecorators(decorators: IDecorators) {
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
export function WrapController<T>(options: AbstractControllerOptions<T>): any {
  const model = options.model;
  class createDto extends model { }
  class updateDto extends PartialType(createDto) { }
  abstract class AbstractController {
    protected readonly _service: AbstractTypeOrmService<T>;
    constructor(service: any) {
      this._service = service;
    }
    @Get()
    @WrapDecorators(options.decorators)
    public async findAll(@Query() query: FindAllQuery): Promise<{ data: { list: T[] } | IpaginationResult<T> }> {
      let result = await this._service.find(query)
      if (options?.afterFunctions?.findAll) {
        result = await options?.afterFunctions?.findAll(result)
      }
      // 判断是否有page
      return {
        data: result
      }
    }
    @WrapDecorators(options.decorators)
    @Get(':id')
    public async findOne(@Param('id') id: number) {
      let result = await this._service.findOne(id);
      if (options?.afterFunctions?.findOne) {
        result = await options?.afterFunctions?.findOne(result)
      }
      return {
        data: result
      }
    }
    @WrapDecorators(options.decorators)
    @Post()
    public async create(@Body() body: createDto) {
      let result = await this._service.create(body);
      if (options?.afterFunctions?.create) {
        result = await options?.afterFunctions?.create(result)
      }
      return {
        data: result
      }
    }
    @WrapDecorators(options.decorators)
    @Put(':id')
    public async update(@Param() id: number, @Body() body: updateDto) {
      let result = await this._service.update(id, body);
      if (options?.afterFunctions?.update) {
        result = await options?.afterFunctions?.update(result)
      }
      return {
        data: result
      }
    }
    @WrapDecorators(options.decorators)
    @Delete(':id')
    public async delete(@Param('id') id: number): Promise<boolean> | never {
      let result = await this._service.delete(id);
      if (options?.afterFunctions?.delete) {
        return options?.afterFunctions?.delete(result)
      } else {
        return result
      }
    }
  }
  return AbstractController;
}
