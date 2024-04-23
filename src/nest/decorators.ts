import { Inject } from '@nestjs/common';
import { ShardingBaseEntity } from '../sharding-base-entity';
import { MetadataUtils } from 'typeorm/metadata-builder/MetadataUtils';

export const InjectRepository = (entity: Function) => {
    const isSharded = MetadataUtils.getInheritanceTree(entity).includes(ShardingBaseEntity);
    const token = isSharded ? `ShardingRepositoryService<${entity.name}>` : `TypeormRepositoryService<${entity.name}>`;
    return Inject(token);
};
