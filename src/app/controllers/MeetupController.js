import { Op } from 'sequelize';
import { isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';

import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class MeetupController {
  // -> Lista Meetups do user
  async index(req, res) {
    // inicia uma condicao vazia
    const where = {};
    // pega os dados da query
    const { date, page = 1 } = req.query;
    // -> se existir alguma data vinda da requisicao cai aqui
    if (date) {
      // formata a data hora
      const parseDate = parseISO(date);
      // pega tudo o que tem da data fornecida
      where.date = {
        [Op.between]: [startOfDay(parseDate), endOfDay(parseDate)],
      };
    }

    // faz a busca no DB
    const meetups = await Meetup.findAll({
      where,
      attributes: [
        'id',
        'title',
        'description',
        'location',
        'date',
        'past',
      ],
      // listagem maxima de 10
      limit: 10,
      // a cada 10 por pagina
      offset: 10 * page - 10,
      order:['date'],
      // inclue o banner e o usuario
      include: [
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    return res.json(meetups);
  }

  async store(req, res) {
    //
    // -> Checagem de das, datas anteriores nao podem ser criadas
    // const data1 = parseISO(req.body.date);
    // const data2 = new Date();
    // const japassou = isBefore(data1, data2);
    // return res.json(japassou);
    //
    if (isBefore(parseISO(req.body.date), new Date())) {
      return res
        .status(400)
        .json({ error: 'Datas anteriores não são permitidas' });
    }

    // Criar
    const meetup = await Meetup.create({
      ...req.body,
      user_id: req.userId,
    });



    return res.json(meetup);
  }

  // -> EDICAO
  async update(req, res) {
    // -> Pega o id dos parametros e faz uma busca no db
    const meetup = await Meetup.findByPk(req.params.id);

    // -> Checagem se o usuario do meetup é o mesmo que vem da requicicao, ou seja só o dono do meetup pode alterar
    if (meetup.user_id !== req.userId) {
      return res.json(
        'Não é possível alterar Meetups que não foram criados por você.'
      );
    }
    // -> Checagem das datas
    // const hoje = new Date();
    // const dataDB = meetup.date;
    // const before = isBefore(hoje, dataDB);
    // -> Checa no banco de dados
    if (isBefore(meetup.date, new Date())) {
      return res
        .status(400)
        .json({ error: 'Meetups que já aconteceram não devem ser alterados.' });
    }
    // e a data que for passada pelo body tambem nao pode ser antiga
    if (isBefore(parseISO(req.body.date), new Date())) {
      return res
        .status(400)
        .json({ error: 'Alterar para datas que já passaram não é permitido' });
    }
    // -> Se tudo deu certo ate aqui
    // faz o update pegando os dados do corpo da requisicao
    await meetup.update(req.body);

    return res.json(meetup);
  }

  // Delete
  async delete(req, res) {
    // -> Pega o id dos parametros e faz uma busca no db
    const meetup = await Meetup.findByPk(req.params.id);
    // -> Checagem se o usuario do meetup é o mesmo que vem da requicicao, ou seja só o dono do meetup pode alterar
    if (meetup.user_id !== req.userId) {
      return res.json(
        'Não é possível cancelar Meetups que não foram criados por você.'
      );
    }
    // -> Ja aconteceu?
    if (isBefore(meetup.date, new Date())) {
      return res.status(400).json({
        error: 'Meetups que já aconteceram não podem ser cancelados.',
      });
    }
    // -> se chegou aate aqui
    await meetup.destroy();
    return res.send('Deleted');
  }
}

export default new MeetupController();
