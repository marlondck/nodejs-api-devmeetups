import * as Yup from 'yup';
import { isBefore, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import File from '../models/File';

class MeetupController {
  // -> Lista Meetups do user
  async index(req, res) {
    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      order: [['date_hour', 'DESC']],
      attributes: ['id', 'title', 'description', 'location', 'date_hour'],
      include: [
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });
    return res.json(meetups);
  }

  async store(req, res) {
    //
    // -> Validacao
    //
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      date_hour: Yup.date().required(),
      location: Yup.string().required(),
      banner_id: Yup.number().required(),
    });
    // -> Verifica se no corpo da requisicao batem com as validacoes do yup
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Erro nas validacões.' });
    }
    //
    // -> Checagem de das, datas anteriores nao podem ser criadas
    // const data1 = parseISO(req.body.date_hour);
    // const data2 = new Date();
    // const japassou = isBefore(data1, data2);
    // return res.json(japassou);
    //
    if (isBefore(parseISO(req.body.date_hour), new Date())) {
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
    // -> Validacao
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      date_hour: Yup.date(),
      location: Yup.string(),
      banner_id: Yup.number(),
    });
    // -> Verifica se no corpo da requisicao batem com as validacoes do yup
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Erro nas validacões.' });
    }

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
    // const dataDB = meetup.date_hour;
    // const before = isBefore(hoje, dataDB);
    // -> Checa no banco de dados
    if (isBefore(meetup.date_hour, new Date())) {
      return res
        .status(400)
        .json({ error: 'Meetups que já aconteceram não devem ser alterados.' });
    }
    // e a data que for passada pelo body tambem nao pode ser antiga
    if (isBefore(parseISO(req.body.date_hour), new Date())) {
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
    if (isBefore(meetup.date_hour, new Date())) {
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
