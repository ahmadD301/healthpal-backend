export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      full_name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM("patient", "doctor", "donor", "ngo", "admin"),
        allowNull: false,
      },
      phone: DataTypes.STRING(20),
      verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  User.associate = (models) => {
    // 1-to-1 relations
    // User.hasOne(models.PatientProfile, { foreignKey: "user_id", as: "patientProfile" });
    // User.hasOne(models.DoctorProfile, { foreignKey: "user_id", as: "doctorProfile" });

    // 1-to-many relations
    // User.hasMany(models.Consultation, { foreignKey: "patient_id", as: "patientConsultations" });
    // User.hasMany(models.Consultation, { foreignKey: "doctor_id", as: "doctorConsultations" });
  };

  return User;
};
