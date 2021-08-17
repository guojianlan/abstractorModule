import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  LessThanOrEqual,
  Repository,
  SelectQueryBuilder,
  MoreThanOrEqual,
  LessThan,
  MoreThan,
  Equal,
  In,
  InsertResult,
  EntityTarget,
} from "typeorm";

export const sqlTransformMap = {
  gte: MoreThanOrEqual,
  gt: MoreThan,
  lte: LessThanOrEqual,
  lt: LessThan,
  eq: Equal,
  in: In,
};
/**
 * 标记是否基础查找时添加dtime=0
 */
export interface AbstractServiceExtraOptions {
  /**
   * 标记是否基础查找时添加dtime=0
   */
  findInjectDeleteWhere?: boolean;
  /**
   * 删除之后的操作
   */
  deleteAfterAction?: "log_time" | "normal" | "log_sql";
  /**
   * 生成记录表的规则
   */
  log_sql_format?: "YYYY" | "YYYY_MM";
  /**
    * page_size 默认为20
    */
  page_size?: number
}
export interface FindAllQuery {
  page?: number
  pageSize?: number
  needPage: boolean
  filter?: {
    [key: string]: any
  }
}
export interface IpaginationResult<T> {
  list?: T[],
  pagination?: {
    count: number,
    page: number,
    pageSize: number
  }
}
const defaultOptions: AbstractServiceExtraOptions = {
  findInjectDeleteWhere: true,
  deleteAfterAction: "log_time",
  log_sql_format: "YYYY",
  page_size: 20
};
export abstract class AbstractTypeOrmService<T> {
  protected _model: Repository<T>;
  protected _entity: EntityTarget<T>;
  protected options: AbstractServiceExtraOptions;
  constructor(
    model: Repository<T>,
    _entity: EntityTarget<T>,
    options: AbstractServiceExtraOptions = {
      ...defaultOptions,
    }
  ) {
    this._model = model;
    this._entity = _entity;
    this.options = Object.assign({
      ...defaultOptions,
      ...options,
    });
  }
  public generatePaginationBuilder(
    builder: SelectQueryBuilder<T>,
    query?: FindAllQuery
  ) {
    let { page = 1, pageSize = this.options.page_size, needPage } = query;
    if (needPage || (query.page && query.pageSize)) {
      if (page < 1) {
        page = 1;
      }
      if (pageSize < 1) {
        pageSize = 1;
      }
      builder.skip((page - 1) * pageSize);
      builder.take(pageSize);
    }
  }
  public realGenerateFilterBuilder(
    builder: SelectQueryBuilder<T>,
    filterName: string,
    filterValue: string
  ) {
    const sqlSplit = filterValue.split(":");
    const [key1, key2OrValue1, value2, ...restValue] = sqlSplit;
    if (key1 == "or") {
      let value;
      if (restValue) {
        value = [value2, ...restValue].join(":");
      } else {
        value = value2;
      }
      const oldValue = value;
      try {
        value = JSON.parse(value);
      } catch (error) {
        value = oldValue;
      }
      if (sqlTransformMap[key2OrValue1]) {
        builder.orWhere({
          [`${filterName}`]: sqlTransformMap[key2OrValue1](value),
        });
      }
    } else {
      let value;
      if (value2) {
        value = [key2OrValue1, value2, ...restValue].join(":");
      } else {
        value = key2OrValue1;
      }
      const oldValue = value;
      try {
        value = JSON.parse(value);
      } catch (error) {
        value = oldValue;
      }
      if (sqlTransformMap[key1]) {
        builder.andWhere({
          [`${filterName}`]: sqlTransformMap[key1](value),
        });
      }
    }
  }
  public generateFilterBuilder(builder: SelectQueryBuilder<T>, query?: any) {
    const { filter } = query;
    if (filter) {
      Object.keys(filter).forEach((item) => {
        if (Array.isArray(filter[item])) {
          const value = [...filter[item]];
          value.forEach((childrenItem) => {
            this.realGenerateFilterBuilder(builder, item, childrenItem);
          });
        } else {
          this.realGenerateFilterBuilder(builder, item, filter[item]);
        }
      });
    }
  }
  public generateOrderBuilder(builder: SelectQueryBuilder<T>, query?: any) {
    const { orderBy } = query;
    if (orderBy) {
      Object.keys(orderBy).forEach((item) => {
        builder.addOrderBy(item, orderBy[item] == -1 ? 'DESC' : 'ASC')
      })
    }else{
      builder.addOrderBy('id', 'DESC')
    }
  }
  public queryBuilder(query?: FindAllQuery) {
    const builder = this._model.createQueryBuilder("model");
    console.log(query)
    if (query) {
      this.generateFilterBuilder(builder, query);
      this.generateOrderBuilder(builder, query)
    }
    return builder;
  }
  public async addDeleteCondition(builder: SelectQueryBuilder<T>) {
    builder.andWhere({
      dtime: 0,
    });
    return builder;
  }
  public async find(query?: FindAllQuery): Promise<{ list: T[] } | IpaginationResult<T>> {
    try {
      let builder = this.queryBuilder(query).andWhere("1=1");
      if (this.options.findInjectDeleteWhere && this.options.deleteAfterAction === 'log_time') {
        this.addDeleteCondition(builder);
      }
      if (query.needPage || (query.page && query.pageSize)) {
        this.generatePaginationBuilder(builder, query);
      }
      if (query.needPage || (query.page && query.pageSize)) {
        let [list, count] = await builder.getManyAndCount();
        return {
          list,
          pagination: {
            count,
            page: +query?.page || 1,
            pageSize: builder?.expressionMap?.take || this.options.page_size
          }
        }
      } else {
        let list = await builder.getMany()
        return {
          list
        }
      }
    } catch (error) {
      throw error
    }
  }
  public async create(body): Promise<T[] | InsertResult> {
    try {
      const createBody = this._model.create(body);
      return await this._model.save(createBody);
    } catch (error) {
      throw error;
    }
  }
  public async update(id: number, body: any): Promise<T> {
    try {
      const entity = await this.findOne(id);
      if (entity) {
        return await this._model.save(Object.assign(entity, body));
      }
    } catch (error) {
      throw error;
    }
  }
  public async findOne(id: number, query?: any): Promise<T | boolean> | never {
    try {
      let builder = this.queryBuilder(query).andWhere("1=1");
      builder.whereInIds(id);
      if (this.options.findInjectDeleteWhere && this.options.deleteAfterAction === 'log_time') {
        this.addDeleteCondition(builder);
      }
      let result = await builder.getOneOrFail();
      return result
    } catch (error) {
      throw new NotFoundException()
    }
  }
  public async delete(id: number): Promise<any> {
    try {
      if (this.options.deleteAfterAction == "log_sql") {
        let result = await this.findOne(id);
        await this._model.delete(result);
        this.deleteLogSql(result);
        return true;
      }
      if (this.options.deleteAfterAction == "log_time") {
        let result = await this.findOne(id);
        if (result) {
          await this._model.update(id, {
            ...(result as any),
            dtime: ~~(+new Date() / 1000),
          });
          return true;
        }
      }
      if (this.options.deleteAfterAction == "normal") {
        let result = await this.findOne(id);
        if (result) {
          await this._model.delete(id);
          return true;
        }
      }
    } catch (error) {
      throw error
    }
  }
  public async deleteLogSql(sql: any) {
    try {
      const mangager = this._model.manager;
      const date = new Date();
      let table_name = date.getFullYear() + "";
      if (this.options.log_sql_format == "YYYY_MM") {
        let month = date.getMonth() + 1;
        month = month > 10 ? month : ((0 + "" + month) as unknown as number);
        table_name = table_name + month;
      }
      const origin_table_name = this._model.metadata.tableName;
      let create_table_name = `log_${this._model.metadata.tableName}_${table_name}`;
      let result = await mangager.query(
        `CREATE TABLE if not exists ${create_table_name} like ${origin_table_name}`
      );
      if (result) {
        await mangager
          .createQueryBuilder()
          .insert()
          .into(create_table_name)
          .values(sql)
          .execute();
        // 成功后添加记录
      }
    } catch (error) {
      throw error
    }
  }
}
