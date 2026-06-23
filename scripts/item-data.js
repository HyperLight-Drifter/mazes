export class RoleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, NumberField } = foundry.data.fields;
    return {
      die:        new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),
      heartsMax:  new NumberField({ required: true, initial: 6, min: 0, integer: true }),
      starsMax:   new NumberField({ required: true, initial: 6, min: 0, integer: true }),
      description: new StringField({ initial: "" }),
    };
  }
}

export class AspectData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      description: new StringField({ initial: "" }),
    };
  }
}

export class ClassData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      die:         new StringField({ initial: "d6", choices: ["d4", "d6", "d8", "d10"] }),
      description: new StringField({ initial: "" }),
    };
  }
}

export class EdgeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      description: new StringField({ initial: "" }),
    };
  }
}

export const itemDataModels = {
  role:   RoleData,
  aspect: AspectData,
  class:  ClassData,
  edge:   EdgeData,
};
