import {type CreationOptional, DataTypes, type ForeignKey, type InferAttributes, type InferCreationAttributes, Model} from 'sequelize';
import {sequelizeConnection} from '../db/config';
import {type Package} from './package';

class LocalPrice extends Model<InferAttributes<LocalPrice>, InferCreationAttributes<LocalPrice>> {
	declare id: CreationOptional<number>;
	declare priceCents: number;
    declare municipality: string;
	declare packageId: ForeignKey<Package['id']>;
}

LocalPrice.init({
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	priceCents: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
    municipality: {
        type: DataTypes.STRING,
		allowNull: false,
    }
}, {
	sequelize: sequelizeConnection,
	indexes: [
        {
            unique: true,
            fields: ['packageId', 'municipality']
        }
    ]
});

export {LocalPrice};