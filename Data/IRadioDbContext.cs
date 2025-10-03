using Microsoft.EntityFrameworkCore;
using RadioQ10.Models;

namespace RadioQ10.Data;

public interface IRadioDbContext
{
    DbSet<SongQueueItem> SongQueue { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    int SaveChanges();
}

