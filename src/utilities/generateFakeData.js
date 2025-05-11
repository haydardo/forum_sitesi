import { faker } from "@faker-js/faker";

const generateFakeData = (num) => {
  const fakeData = [];
  const usedEmails = new Set(); // Set  JSte benzersiz değerleri tutar

  for (let i = 0; i < num; i++) {
    let email;
    do {
      email = `${faker.string.alphanumeric(
        10
      )}_${i}@${faker.internet.domainName()}`;
    } while (usedEmails.has(email)); // email kontrolü

    usedEmails.add(email);

    const fakeUser = {
      username: `${faker.internet.username()}${faker.number.int(999)}`,
      email,
      password: faker.internet.password(),
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      role: "user",
      account_status: "active",
      created_at: faker.date.past(),
      updated_at: new Date(),
    };
    fakeData.push(fakeUser);
  }

  return fakeData;
};

export default generateFakeData;
