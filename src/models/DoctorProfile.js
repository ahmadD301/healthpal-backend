export default (sequelize, DataTypes) => {
  const DoctorProfile = sequelize.define(
    "DoctorProfile",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      specialty: DataTypes.STRING(100),
      license_no: DataTypes.STRING(100),
      experience_years: DataTypes.INTEGER,
      consultation_fee: DataTypes.DECIMAL(10, 2),
      available: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: "doctor_profiles",
      timestamps: false,
    }
  );

  DoctorProfile.associate = (models) => {
    DoctorProfile.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return DoctorProfile;
};
