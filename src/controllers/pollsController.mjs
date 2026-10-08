import mongoose from 'mongoose';
import Poll from '../models/poll.mjs';
import PollAnswer from '../models/pollAnswer.mjs';
import Event from '../models/event.mjs';
import * as cascade from '../utils/cascade.mjs';
import { badRequest, notFound } from '../utils/AppError.mjs';
import { USER_FIELDS, loadEvent, requireOrganizer, requireEventMember, canSeeEvent } from '../utils/access.mjs';
import { sameId } from '../utils/helpers.mjs';

const loadPoll = async (id, user) => {
  const poll = await Poll.findById(id);
  if (!poll) throw notFound('Sondage');
  const event = await Event.findById(poll.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Sondage');
  requireEventMember(event, user);
  return { poll, event };
};

// Un organisateur crée un sondage (1 ou plusieurs questions)
export const createPoll = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  const poll = await Poll.create({
    evenement: event._id,
    createur: req.user._id,
    titre: req.body.titre,
    questions: req.body.questions.map((q) => ({ intitule: q.intitule, options: q.options.map((texte) => ({ texte })) }))
  });
  res.status(201).json(poll);
};

export const listPolls = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireEventMember(event, req.user);
  const polls = await Poll.find({ evenement: event._id }).sort({ createdAt: -1 }).populate('createur', USER_FIELDS);
  const answered = await PollAnswer.find({ sondage: { $in: polls.map((p) => p._id) }, participant: req.user._id }).distinct('sondage');
  res.json(polls.map((p) => ({ ...p.toJSON(), aRepondu: answered.some((id) => sameId(id, p._id)) })));
};

export const getPoll = async (req, res) => {
  const { poll } = await loadPoll(req.params.id, req.user);
  await poll.populate('createur', USER_FIELDS);
  const mine = await PollAnswer.findOne({ sondage: poll._id, participant: req.user._id });
  res.json({ ...poll.toJSON(), aRepondu: Boolean(mine), mesReponses: mine?.reponses ?? [] });
};

export const deletePoll = async (req, res) => {
  const { poll, event } = await loadPoll(req.params.id, req.user);
  requireOrganizer(event, req.user);
  await cascade.deletePoll(poll._id);
  res.status(204).end();
};

// Un participant choisit 1 réponse pour chaque question (il peut modifier son vote)
export const answerPoll = async (req, res) => {
  const { poll } = await loadPoll(req.params.id, req.user);
  const { reponses } = req.body;

  const errors = [];
  for (const question of poll.questions) {
    const answer = reponses.find((r) => sameId(r.questionId, question._id));
    if (!answer) errors.push({ champ: 'reponses', message: `Question sans réponse : « ${question.intitule} »` });
    else if (!question.options.id(answer.optionId)) errors.push({ champ: 'reponses', message: `Option invalide pour « ${question.intitule} »` });
  }
  for (const r of reponses) {
    if (!poll.questions.id(r.questionId)) errors.push({ champ: 'reponses', message: `Question inconnue : ${r.questionId}` });
  }
  if (errors.length) throw badRequest('Réponses invalides : une réponse par question est attendue.', errors);

  const answer = await PollAnswer.findOneAndUpdate(
    { sondage: poll._id, participant: req.user._id },
    { $set: { reponses: reponses.map((r) => ({ question: r.questionId, option: r.optionId })) } },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(200).json(answer);
};

export const getResults = async (req, res) => {
  const { poll } = await loadPoll(req.params.id, req.user);
  const counts = await PollAnswer.aggregate([
    { $match: { sondage: new mongoose.Types.ObjectId(String(poll._id)) } },
    { $unwind: '$reponses' },
    { $group: { _id: '$reponses.option', votes: { $sum: 1 } } }
  ]);
  const nbRepondants = await PollAnswer.countDocuments({ sondage: poll._id });
  const votesFor = (optionId) => counts.find((c) => sameId(c._id, optionId))?.votes ?? 0;
  res.json({
    sondage: poll._id,
    titre: poll.titre,
    nbRepondants,
    questions: poll.questions.map((q) => ({
      _id: q._id,
      intitule: q.intitule,
      options: q.options.map((o) => {
        const votes = votesFor(o._id);
        return { _id: o._id, texte: o.texte, votes, pourcentage: nbRepondants ? Math.round((votes / nbRepondants) * 1000) / 10 : 0 };
      })
    }))
  });
};
