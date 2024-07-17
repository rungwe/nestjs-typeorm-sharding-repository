import {
    DeepPartial,
    SaveOptions,
    RemoveOptions,
    ObjectID,
    FindOptionsWhere,
    UpdateResult,
    DeleteResult,
    FindManyOptions,
    FindOneOptions,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export interface AbstractRepositoryService<Entity> {
    create(entityLike: DeepPartial<Entity>): Entity;
    create(entityLike: DeepPartial<Entity>[]): Entity[];

    save(entities: DeepPartial<Entity>[], options?: SaveOptions): Promise<Entity[]>;
    save(entity: DeepPartial<Entity>, options?: SaveOptions): Promise<Entity>;

    remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;
    remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;

    softRemove(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;
    softRemove(entity: Entity, options?: SaveOptions): Promise<Entity>;

    update(
        criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>,
        partialEntity: QueryDeepPartialEntity<Entity>, shardingKey?:string
    ): Promise<UpdateResult>;

    delete(
        criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>, shardingKey?:string
    ): Promise<DeleteResult>;

    count(options?: FindManyOptions<Entity>, shardingKey?:string): Promise<number>;
    countBy(where: FindOptionsWhere<Entity>, shardingKey?:string): Promise<number>;

    find(options?: FindManyOptions<Entity>, shardingKey?:string): Promise<Entity[]>;
    findBy(where: FindOptionsWhere<Entity>, shardingKey?:string): Promise<Entity[]>;

    findAndCount(options?: FindManyOptions<Entity>, shardingKey?:string): Promise<[Entity[], number]>;
    findAndCountBy(where: FindOptionsWhere<Entity>, shardingKey?:string): Promise<[Entity[], number]>;

    findOne(options: FindOneOptions<Entity>, shardingKey?:string): Promise<Entity | null | undefined>;
    findOneBy(where: FindOptionsWhere<Entity>, shardingKey?:string): Promise<Entity | null | undefined>;
    findOneById(id: string | number | Date | ObjectID, shardingKey?: string): Promise<Entity | null>;
    findByIds(ids: any[], shardingKey?: string): Promise<Entity[]>;
}
