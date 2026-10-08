// Suppressions en cascade (pas de clés étrangères dans MongoDB)
import Discussion from '../models/discussion.mjs';
import Message from '../models/message.mjs';
import Album from '../models/album.mjs';
import Photo from '../models/photo.mjs';
import PhotoComment from '../models/photoComment.mjs';
import Poll from '../models/poll.mjs';
import PollAnswer from '../models/pollAnswer.mjs';
import TicketType from '../models/ticketType.mjs';
import Ticket from '../models/ticket.mjs';
import ShoppingItem from '../models/shoppingItem.mjs';
import Carpool from '../models/carpool.mjs';
import Event from '../models/event.mjs';
import Group from '../models/group.mjs';

export const deleteDiscussions = async (filter) => {
  const ids = await Discussion.find(filter).distinct('_id');
  await Message.deleteMany({ discussion: { $in: ids } });
  await Discussion.deleteMany({ _id: { $in: ids } });
};

export const deletePhotos = async (filter) => {
  const ids = await Photo.find(filter).distinct('_id');
  await PhotoComment.deleteMany({ photo: { $in: ids } });
  await Photo.deleteMany({ _id: { $in: ids } });
};

export const deleteAlbum = async (albumId) => {
  await deletePhotos({ album: albumId });
  await Album.deleteOne({ _id: albumId });
};

export const deletePoll = async (pollId) => {
  await PollAnswer.deleteMany({ sondage: pollId });
  await Poll.deleteOne({ _id: pollId });
};

export const deleteEvent = async (eventId) => {
  await deleteDiscussions({ evenement: eventId });
  await deletePhotos({ evenement: eventId });
  await Album.deleteMany({ evenement: eventId });
  const pollIds = await Poll.find({ evenement: eventId }).distinct('_id');
  await PollAnswer.deleteMany({ sondage: { $in: pollIds } });
  await Poll.deleteMany({ evenement: eventId });
  await Ticket.deleteMany({ evenement: eventId });
  await TicketType.deleteMany({ evenement: eventId });
  await ShoppingItem.deleteMany({ evenement: eventId });
  await Carpool.deleteMany({ evenement: eventId });
  await Event.deleteOne({ _id: eventId });
};

// Les événements du groupe sont conservés mais détachés du groupe
export const deleteGroup = async (groupId) => {
  await deleteDiscussions({ groupe: groupId });
  await Event.updateMany({ groupe: groupId }, { $set: { groupe: null } });
  await Group.deleteOne({ _id: groupId });
};
