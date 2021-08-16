# nest abstract module

## how use

### change controller.ts

```ts
import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { WrapController } from "nestjs-abstract-module";
import { UserEntity } from "./entity";
import { UserService } from "./user.service";
const CrudController = WrapController<UserEntity>({
  model: UserEntity,
  afterFunctions: {
    findOne: (result) => {
      return result;
    },
  },
});
@Controller("user")
export class UserController extends CrudController {
  constructor(private readonly service: UserService) {
    super(service);
  }
}
```

### change service.ts

```ts
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { AbstractTypeOrmService } from "nestjs-abstract-module";
import { UserEntity } from "./entity";

@Injectable()
export class UserService extends AbstractTypeOrmService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>
  ) {
    super(repository, UserEntity);
  }
  getUsers(): Promise<UserEntity[]> {
    throw new HttpException("asd", HttpStatus.FORBIDDEN);
  }
}
```

### change entity.ts

```ts
import { IsNumber, IsOptional, IsString } from "class-validator";
import { AbstractTypeEntity } from "nestjs-abstract-module";
import { Column, Entity } from "typeorm";

@Entity("users")
export class UserEntity extends AbstractTypeEntity {

}
```
