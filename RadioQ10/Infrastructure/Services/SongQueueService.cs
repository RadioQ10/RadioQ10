using Microsoft.EntityFrameworkCore;
using RadioQ10.Application.Interfaces;
using RadioQ10.Domain.Entities;
using RadioQ10.Infrastructure.Persistence;

namespace RadioQ10.Infrastructure.Services;

public sealed class SongQueueService : ISongQueueService
{
    private readonly IRadioDbContext _dbContext;

    public SongQueueService(IRadioDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public IReadOnlyCollection<SongQueueItem> GetAll()
    {
        return _dbContext.SongQueue
            .AsNoTracking()
            .OrderBy(item => item.EnqueuedAt)
            .ToList();
    }

    public SongQueueItem? Get(Guid id)
    {
        return _dbContext.SongQueue
            .AsNoTracking()
            .FirstOrDefault(item => item.Id == id);
    }

    public async Task<SongQueueItem> Enqueue(string videoId, string title, string? channelTitle, string? thumbnailUrl, Guid userId, string? requestedBy)
    {
        var user = _dbContext.Users
            .AsNoTracking()
            .FirstOrDefault(u => u.Id == userId) ?? throw new ArgumentException("El usuario especificado no existe.", nameof(userId));

        var any = (from q in _dbContext.SongQueue
                   where q.VideoId == videoId
                   select q).Any();

        if (any)
        {
            return null;
        }

        var item = new SongQueueItem
        {
            Id = Guid.NewGuid(),
            VideoId = videoId,
            Title = title,
            ChannelTitle = channelTitle,
            ThumbnailUrl = thumbnailUrl,
            RequestedBy = user.Name,
            RequestedByUserId = user.Id,
            EnqueuedAt = DateTimeOffset.UtcNow
        };

        _dbContext.SongQueue.Add(item);
        _dbContext.SaveChanges();

        return item;
    }

    public bool Remove(Guid id)
    {
        var entity = _dbContext.SongQueue.FirstOrDefault(item => item.Id == id);
        if (entity is null)
        {
            return false;
        }

        _dbContext.SongQueue.Remove(entity);
        _dbContext.SaveChanges();
        return true;
    }
}

