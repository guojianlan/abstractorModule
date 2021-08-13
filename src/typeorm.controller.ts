/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Body, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AbstractTypeOrmService } from './typeorm.service';
import { PartialType } from '@nestjs/mapped-types';
export interface IDecorators {
  findAll?: Array<MethodDecorator | PropertyDecorator>;
  findOne?: Array<MethodDecorator | PropertyDecorator>;
  create?: Array<MethodDecorator | PropertyDecorator>;
  update?: Array<MethodDecorator | PropertyDecorator>;
  delete?: Array<MethodDecorator | PropertyDecorator>;
}
export type AbstractControllerOptions<T> = {
  model: any;
  decorators?: IDecorators;
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
  new (...args: any[]): T;
};
export function WrapController<T>(options: AbstractControllerOptions<T>): any {
  const model = options.model;
  class createDto extends model {}
  class updateDto extends PartialType(createDto) {}
  abstract class AbstractController {
    protected readonly _service: AbstractTypeOrmService<T>;
    constructor(service: any) {
      this._service = service;
    }
    @Get()
    @WrapDecorators(options.decorators)
    public async findAll() {
      return this._service.find();
    }
    @WrapDecorators(options.decorators)
    @Get(':id')
    public async findOne(@Param('id') id: number) {
      return this._service.findOne(id);
    }
    @WrapDecorators(options.decorators)
    @Post()
    public async create(@Body() body: createDto) {
      return this._service.create(body);
    }
    @WrapDecorators(options.decorators)
    @Put(':id')
    public async update(@Param() id: number, @Body() body: updateDto) {
      return this._service.update(id, body);
    }
    @WrapDecorators(options.decorators)
    @Delete(':id')
    public async delete(@Param('id') id: number) {
      return this._service.delete(id);
    }
  }
  return AbstractController;
}
