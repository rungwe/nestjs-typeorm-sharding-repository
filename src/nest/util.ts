import { BaseEntity } from "typeorm";
import { MetadataUtils } from "typeorm/metadata-builder/MetadataUtils";
import { ShardingBaseEntity } from "../sharding-base-entity";

export function getRepositoryToken<T extends typeof BaseEntity | typeof ShardingBaseEntity>(entityType: T): string {
  const isSharded = MetadataUtils.getInheritanceTree(entityType as Function).includes(ShardingBaseEntity);
  return isSharded ? `ShardingRepositoryService<${entityType.name}>` : `TypeormRepositoryService<${entityType.name}>`;
}
