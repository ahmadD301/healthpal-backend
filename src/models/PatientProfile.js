export default (sequelize, DataTypes) => {
  const PatientProfile = sequelize.define(
    "PatientProfile",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      age: DataTypes.INTEGER,
      gender: DataTypes.ENUM("male", "female", "other"),
      blood_type: DataTypes.STRING(5),
      medical_history: DataTypes.TEXT,
      location: DataTypes.STRING(255),
    },
    {
      tableName: "patient_profiles",
      timestamps: false,
    }
  );

  PatientProfile.associate = (models) => {
    PatientProfile.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return PatientProfile;
};
