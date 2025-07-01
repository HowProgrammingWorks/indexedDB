import { Repository, Service } from './core.js';

export class UserModel {
  constructor(name, age) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Invalid name');
    }
    if (!Number.isInteger(age) || age < 0) {
      throw new Error('Invalid age');
    }
    this.name = name.trim();
    this.age = age;
  }
}

export class UserRepository extends Repository {
  constructor(database) {
    super(database, 'user');
  }
}

export class UserService extends Service {
  async createUser(name, age) {
    const user = new UserModel(name, age);
    await this.repository.insert(user);
    return user;
  }

  async incrementAge(id) {
    const user = await this.repository.get(id);
    if (!user) throw new Error('User with id=1 not found');
    user.age += 1;
    await this.repository.update(user);
    return user;
  }

  async findAdults() {
    const users = await this.repository.getAll();
    return users.filter((user) => user.age >= 18);
  }
}
