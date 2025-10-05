using Microsoft.EntityFrameworkCore;
using RadioQ10.Domain.Entities;

namespace RadioQ10.Infrastructure.Persistence;

public interface IRadioDbContext
{
    DbSet<SongQueueItem> SongQueue { get; }

    DbSet<RadioUser> Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    int SaveChanges();
}

